from unittest.mock import MagicMock, patch
from pathlib import Path

import pytest

from jobs import upload_gff as upload_task

pytestmark = pytest.mark.unit


def _run_task(*args):
    """Invoke bind=True task body with a mock Celery self (no backend)."""
    self_mock = MagicMock()
    return upload_task.compute_custom_gff_stats.run.__func__(self_mock, *args)


class TestUploadGffTask:
    def test_missing_file_raises_and_cleans(self, tmp_path, monkeypatch):
        monkeypatch.setenv("LOCAL_ANNOTATIONS_DIR", str(tmp_path))
        upload_uuid = "abc123"
        tmp_dir = tmp_path / "uploads_tmp" / upload_uuid
        tmp_dir.mkdir(parents=True)

        with patch.object(upload_task.shutil, "rmtree") as rmtree:
            with pytest.raises(FileNotFoundError):
                _run_task(upload_uuid, "missing.gff", "Name")
            rmtree.assert_called()

    def test_empty_summary_raises_and_cleans(self, tmp_path, monkeypatch):
        monkeypatch.setenv("LOCAL_ANNOTATIONS_DIR", str(tmp_path))
        upload_uuid = "u-empty"
        tmp_dir = tmp_path / "uploads_tmp" / upload_uuid
        tmp_dir.mkdir(parents=True)
        src = tmp_dir / "ann.gff"
        src.write_text("chr1\tRefSeq\tgene\t1\t10\t.\t+\t.\tID=g1\n")

        def fake_sort(_inp, out):
            Path(out).write_text(src.read_text())

        summary = MagicMock()
        summary.types = []
        summary.sources = []

        with (
            patch.object(upload_task.annotation_service, "sort_gff_file", side_effect=fake_sort),
            patch.object(
                upload_task.pysam_helper,
                "stream_plain_gff_file",
                return_value=[],
            ),
            patch.object(
                upload_task,
                "_compute_features_summary_from_lines",
                return_value=summary,
            ),
            patch.object(
                upload_task,
                "_compute_features_statistics_from_lines",
                return_value=MagicMock(),
            ),
            patch.object(upload_task.shutil, "rmtree") as rmtree,
        ):
            with pytest.raises(ValueError, match="no types or sources"):
                _run_task(upload_uuid, "ann.gff", "Name")
            rmtree.assert_called()

    def test_happy_path(self, tmp_path, monkeypatch):
        monkeypatch.setenv("LOCAL_ANNOTATIONS_DIR", str(tmp_path))
        upload_uuid = "u1"
        tmp_dir = tmp_path / "uploads_tmp" / upload_uuid
        tmp_dir.mkdir(parents=True)
        src = tmp_dir / "ann.gff"
        gff = (
            "chr1\tRefSeq\tgene\t1\t10\t.\t+\t.\tID=g1\n"
            "chr1\tRefSeq\texon\t1\t10\t.\t+\t.\tID=e1;Parent=g1\n"
        )
        src.write_text(gff)

        def fake_sort(_inp, out):
            Path(out).write_text(gff)

        summary = MagicMock()
        summary.types = ["gene"]
        summary.sources = ["RefSeq"]
        summary.to_mongo.return_value.to_dict.return_value = {"types": ["gene"]}
        stats = MagicMock()
        stats.to_mongo.return_value.to_dict.return_value = {}

        with (
            patch.object(upload_task.annotation_service, "sort_gff_file", side_effect=fake_sort),
            patch.object(
                upload_task.pysam_helper,
                "stream_plain_gff_file",
                return_value=gff.splitlines(keepends=True),
            ),
            patch.object(
                upload_task,
                "_compute_features_summary_from_lines",
                return_value=summary,
            ),
            patch.object(
                upload_task,
                "_compute_features_statistics_from_lines",
                return_value=stats,
            ),
        ):
            result = _run_task(upload_uuid, "ann.gff", "My name")

        assert result["is_custom"] is True
        assert result["custom_name"] == "My name"
        assert result["annotation_id"]
        assert not tmp_dir.exists()
