from unittest.mock import MagicMock, patch

import pytest

pytestmark = pytest.mark.integration


class TestJobsAuth:
    def test_missing_key_401(self, client):
        resp = client.post(
            "/jobs/update/taxonomy/export-flattened",
            headers={"X-Auth-Key": "wrong-key"},
        )
        assert resp.status_code == 401

    def test_good_key_triggers_delay(self, client, auth_headers):
        mock_delay = MagicMock()
        with patch(
            "services.jobs_service.export_flattened_taxonomy",
        ) as task:
            task.delay = mock_delay
            resp = client.post(
                "/jobs/update/taxonomy/export-flattened",
                headers=auth_headers,
            )
        assert resp.status_code == 200, resp.text
        mock_delay.assert_called_once()
        assert "message" in resp.json()
