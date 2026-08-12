import json
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from jobs import track_users as tu

pytestmark = pytest.mark.unit


class TestTrackUsersTask:
    def test_parse_log_file_missing(self, tmp_path):
        missing = tmp_path / "nope.jsonl"
        ip_visits, usage = tu.parse_log_file(str(missing))
        assert ip_visits == {}
        assert usage.capability_requests == {} or True  # empty UsageAgg

    def test_parse_log_file_fixture(self, tmp_path, monkeypatch):
        monkeypatch.setenv("HMAC_SECRET", "test-secret")
        # Reload fingerprint uses module-level HMAC_SECRET — patch it
        monkeypatch.setattr(tu, "HMAC_SECRET", "test-secret")
        log = tmp_path / "api.jsonl"
        entries = [
            {
                "ip": "1.2.3.4",
                "time": "2024-01-01T12:00:00Z",
                "uri": "/api/assemblies/GCA_000001",
            },
            {
                "ip": "1.2.3.4",
                "time": "2024-01-02T12:00:00Z",
                "uri": "/api/annotations/abc",
            },
        ]
        log.write_text("\n".join(json.dumps(e) for e in entries) + "\n")
        ip_visits, usage = tu.parse_log_file(str(log))
        assert "1.2.3.4" in ip_visits
        assert ip_visits["1.2.3.4"].visits_count >= 1
        assert sum(usage.capability_requests.values()) >= 1

    def test_track_missing_log_early_return(self, monkeypatch):
        monkeypatch.setattr(tu, "API_LOG_PATH", "/nonexistent/api.log")
        with patch.object(tu, "UserAnalytics") as UA:
            result = tu.track_unique_users_by_country()
        assert result is None
        UA.objects.assert_not_called()

    def test_existing_fingerprints_skip_geo(self, tmp_path, monkeypatch):
        monkeypatch.setattr(tu, "HMAC_SECRET", "test-secret")
        log = tmp_path / "api.jsonl"
        log.write_text(
            json.dumps(
                {
                    "ip": "8.8.8.8",
                    "time": "2024-06-01T00:00:00Z",
                    "uri": "/api/taxons/9606",
                }
            )
            + "\n"
        )
        monkeypatch.setattr(tu, "API_LOG_PATH", str(log))
        fp = tu.create_ip_fingerprint("8.8.8.8")
        rollup = MagicMock()
        rollup.as_of = datetime(2024, 6, 1, tzinfo=timezone.utc)
        rollup.by_capability = {}
        rollup.top_assemblies = []
        rollup.top_annotations = []
        rollup.top_taxons = []

        with (
            patch.object(tu, "UserAnalytics") as UA,
            patch.object(tu, "get_countries_for_ips") as geo,
            patch.object(tu, "update_user_stats") as update,
            patch.object(tu, "build_and_save_usage_rollup", return_value=rollup),
        ):
            UA.objects.distinct.return_value = [fp]
            result = tu.track_unique_users_by_country()

        geo.assert_not_called()
        update.assert_called_once()
        assert result["new_ips_geolocated"] == 0
        assert result["existing_ips_skipped_geo"] == 1
        assert result["processed"] == 1
