from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from jobs.upload_gff import compute_custom_gff_stats

pytestmark = pytest.mark.integration

TINY_GFF = (
    "chr1\tRefSeq\tgene\t1\t100\t.\t+\t.\tID=g1;biotype=protein_coding\n"
    "chr1\tRefSeq\tmRNA\t1\t100\t.\t+\t.\tID=t1;Parent=g1\n"
    "chr1\tRefSeq\texon\t1\t100\t.\t+\t.\tID=e1;Parent=t1\n"
    "chr1\tRefSeq\tCDS\t1\t99\t.\t+\t0\tID=c1;Parent=t1\n"
)


class TestUploadGff:
    def test_rate_limit_endpoint(self, client):
        resp = client.get("/annotations/upload-gff/rate-limit")
        assert resp.status_code == 200
        body = resp.json()
        assert "used" in body
        assert "remaining" in body
        assert body["used"] == 0

    def test_upload_and_poll_success(self, client, annotations_dir):
        def fake_sort(inp, out):
            Path(out).write_text(Path(inp).read_text())

        stored: dict[str, dict] = {}

        def fake_delay(upload_uuid, filename, custom_name):
            self_mock = MagicMock()
            result = compute_custom_gff_stats.run.__func__(
                self_mock, upload_uuid, filename, custom_name
            )
            task_id = "eager-upload-task"
            stored[task_id] = result
            async_result = MagicMock()
            async_result.id = task_id
            return async_result

        class FakeAsyncResult:
            def __init__(self, task_id, app=None):
                self.task_id = task_id
                self._result = stored.get(task_id)

            def ready(self):
                return self.task_id in stored

            def successful(self):
                return self.task_id in stored

            @property
            def result(self):
                return self._result

            @property
            def traceback(self):
                return None

        with (
            patch(
                "jobs.upload_gff.annotation_service.sort_gff_file",
                side_effect=fake_sort,
            ),
            patch("services.upload_gff_service.compute_custom_gff_stats") as task_mod,
            patch("api.annotations.AsyncResult", FakeAsyncResult),
        ):
            task_mod.delay = fake_delay
            files = {"file": ("tiny.gff", TINY_GFF.encode(), "text/plain")}
            data = {"custom_name": "My custom GFF"}
            resp = client.post("/annotations/upload-gff", files=files, data=data)

            assert resp.status_code == 200, resp.text
            payload = resp.json()
            assert payload["task_id"] == "eager-upload-task"
            assert "remaining_quota" in payload

            status = client.get(
                f"/annotations/upload-gff/jobs/{payload['task_id']}"
            )
            assert status.status_code == 200
            body = status.json()
            assert body["state"] == "SUCCESS"
            assert body["result"]["is_custom"] is True
            assert body["result"]["custom_name"] == "My custom GFF"
            assert body["result"]["annotation_id"]
