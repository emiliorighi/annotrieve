import pytest

from tests.integration.factories import make_usage_rollup, make_user_analytics

pytestmark = pytest.mark.integration


class TestAnalytics:
    def test_summary(self, client):
        make_user_analytics(fingerprint="fp1", country="ES", visits_count=3)
        make_user_analytics(fingerprint="fp2", country="US", visits_count=1)
        resp = client.get("/analytics/summary")
        assert resp.status_code == 200
        body = resp.json()
        assert body["unique_users"] == 2
        assert body["countries"] == 2

    def test_top_countries(self, client):
        make_user_analytics(fingerprint="fp1", country="ES", visits_count=5)
        make_user_analytics(fingerprint="fp2", country="ES", visits_count=2)
        make_user_analytics(fingerprint="fp3", country="US", visits_count=1)
        resp = client.get("/analytics/top-countries", params={"limit": 5})
        assert resp.status_code == 200
        rows = resp.json()
        assert isinstance(rows, list)
        assert rows[0]["country"] == "ES"
        assert rows[0]["unique_users"] == 2

    def test_capabilities_with_rollup(self, client):
        make_usage_rollup()
        resp = client.get("/analytics/capabilities")
        assert resp.status_code == 200
