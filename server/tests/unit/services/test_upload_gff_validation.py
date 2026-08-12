from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from services import upload_gff_service as upload_svc

pytestmark = pytest.mark.unit


class TestValidateExtension:
    @pytest.mark.parametrize(
        "filename",
        ["a.gff", "a.gff3", "a.GFF.GZ", "ann.gff3.gz"],
    )
    def test_accepts_allowed(self, filename):
        upload_svc._validate_extension(filename)

    @pytest.mark.parametrize(
        "filename",
        ["a.txt", "a.gff.bz2", "noext", ""],
    )
    def test_rejects_disallowed(self, filename):
        with pytest.raises(HTTPException) as ctx:
            upload_svc._validate_extension(filename)
        assert ctx.value.status_code == 400


class TestRateLimit:
    def test_status_under_limit(self):
        qs = MagicMock()
        qs.count.return_value = 3
        with (
            patch.object(upload_svc.UploadRateLimit, "objects", return_value=qs),
            patch.object(upload_svc.settings, "UPLOAD_DAILY_LIMIT", 10),
        ):
            status = upload_svc.get_rate_limit_status("1.2.3.4", "ua")
        assert status == {"used": 3, "remaining": 7}

    def test_enforce_under_limit(self):
        qs = MagicMock()
        qs.count.return_value = 2
        with (
            patch.object(upload_svc.UploadRateLimit, "objects", return_value=qs),
            patch.object(upload_svc.settings, "UPLOAD_DAILY_LIMIT", 5),
        ):
            used, remaining = upload_svc._enforce_rate_limit("1.2.3.4", "ua")
        assert used == 3
        assert remaining == 2

    def test_enforce_raises_429_when_exhausted(self):
        qs = MagicMock()
        qs.count.return_value = 5
        with (
            patch.object(upload_svc.UploadRateLimit, "objects", return_value=qs),
            patch.object(upload_svc.settings, "UPLOAD_DAILY_LIMIT", 5),
        ):
            with pytest.raises(HTTPException) as ctx:
                upload_svc._enforce_rate_limit("1.2.3.4", "ua")
        assert ctx.value.status_code == 429
        assert ctx.value.detail["remaining"] == 0


def _upload_file(filename: str, chunks: list[bytes]) -> MagicMock:
    upload = MagicMock()
    upload.filename = filename
    upload.read = AsyncMock(side_effect=chunks + [b""])
    return upload


class TestEnqueueUploadGffJob:
    @pytest.mark.asyncio
    async def test_happy_path(self, tmp_path, monkeypatch):
        monkeypatch.setenv("LOCAL_ANNOTATIONS_DIR", str(tmp_path))
        rate_doc = MagicMock()
        task = MagicMock(id="task-123")
        upload = _upload_file("ann.gff3", [b"##gff-version 3\n"])

        with (
            patch.object(
                upload_svc, "_enforce_rate_limit", return_value=(2, 8)
            ),
            patch.object(
                upload_svc,
                "_write_temp_file",
                new=AsyncMock(return_value=str(tmp_path / "ann.gff3")),
            ),
            patch.object(upload_svc, "UploadRateLimit", return_value=rate_doc),
            patch(
                "services.upload_gff_service.compute_custom_gff_stats.delay",
                return_value=task,
            ) as delay,
        ):
            result = await upload_svc.enqueue_upload_gff_job(
                "1.2.3.4", "ua", upload, "My upload"
            )

        assert result == {"task_id": "task-123", "remaining_quota": 8}
        delay.assert_called_once()
        assert rate_doc.save.call_count >= 2
        assert rate_doc.task_id == "task-123"

    @pytest.mark.asyncio
    async def test_blank_custom_name(self):
        upload = _upload_file("ann.gff3", [b"x"])
        with pytest.raises(HTTPException) as ctx:
            await upload_svc.enqueue_upload_gff_job("ip", "ua", upload, "  ")
        assert ctx.value.status_code == 400

    @pytest.mark.asyncio
    async def test_empty_file(self, tmp_path, monkeypatch):
        monkeypatch.setenv("LOCAL_ANNOTATIONS_DIR", str(tmp_path))
        qs = MagicMock()
        qs.count.return_value = 0
        upload = _upload_file("ann.gff3", [])
        with (
            patch.object(upload_svc.settings, "UPLOAD_DAILY_LIMIT", 10),
            patch.object(upload_svc.settings, "UPLOAD_MAX_BYTES", 1024),
            patch.object(upload_svc.UploadRateLimit, "objects", return_value=qs),
            patch(
                "services.upload_gff_service.compute_custom_gff_stats.delay"
            ) as delay,
        ):
            with pytest.raises(HTTPException) as ctx:
                await upload_svc.enqueue_upload_gff_job("ip", "ua", upload, "Name")
        assert ctx.value.status_code == 400
        delay.assert_not_called()

    @pytest.mark.asyncio
    async def test_oversize_413(self, tmp_path, monkeypatch):
        monkeypatch.setenv("LOCAL_ANNOTATIONS_DIR", str(tmp_path))
        qs = MagicMock()
        qs.count.return_value = 0
        upload = _upload_file("ann.gff3", [b"abcdefghij"])
        with (
            patch.object(upload_svc.settings, "UPLOAD_DAILY_LIMIT", 10),
            patch.object(upload_svc.settings, "UPLOAD_MAX_BYTES", 5),
            patch.object(upload_svc.UploadRateLimit, "objects", return_value=qs),
            patch(
                "services.upload_gff_service.compute_custom_gff_stats.delay"
            ) as delay,
        ):
            with pytest.raises(HTTPException) as ctx:
                await upload_svc.enqueue_upload_gff_job("ip", "ua", upload, "Name")
        assert ctx.value.status_code == 413
        delay.assert_not_called()

    @pytest.mark.asyncio
    async def test_rate_exhausted_429(self):
        qs = MagicMock()
        qs.count.return_value = 5
        upload = _upload_file("ann.gff3", [b"x"])
        with (
            patch.object(upload_svc.settings, "UPLOAD_DAILY_LIMIT", 5),
            patch.object(upload_svc.UploadRateLimit, "objects", return_value=qs),
            patch(
                "services.upload_gff_service.compute_custom_gff_stats.delay"
            ) as delay,
        ):
            with pytest.raises(HTTPException) as ctx:
                await upload_svc.enqueue_upload_gff_job("ip", "ua", upload, "Name")
        assert ctx.value.status_code == 429
        delay.assert_not_called()
