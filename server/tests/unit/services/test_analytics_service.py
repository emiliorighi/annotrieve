from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from services import analytics_service as svc

pytestmark = pytest.mark.unit


class TestAnalyticsService:
    def test_usage_summary(self):
        latest = MagicMock(last_visit=datetime(2026, 1, 1, tzinfo=timezone.utc))
        objects = MagicMock()
        objects.count.return_value = 10
        objects.return_value.count.return_value = 4
        objects.distinct.return_value = ["ES", "US"]
        objects.order_by.return_value.only.return_value.first.return_value = latest

        # UserAnalytics.objects(...) and UserAnalytics.objects.count()
        def objects_callable(*args, **kwargs):
            m = MagicMock()
            m.count.return_value = 4
            return m

        objects_callable.count = MagicMock(return_value=10)
        objects_callable.distinct = MagicMock(return_value=["ES", "US"])
        objects_callable.order_by = MagicMock(
            return_value=MagicMock(
                only=MagicMock(return_value=MagicMock(first=MagicMock(return_value=latest)))
            )
        )

        with patch.object(svc, "UserAnalytics") as UA:
            UA.objects = objects_callable
            # visits_count__gte=2 path
            def side_effect(*args, **kwargs):
                m = MagicMock()
                if kwargs.get("visits_count__gte") == 2:
                    m.count.return_value = 3
                else:
                    m.count.return_value = 4
                return m

            UA.objects = MagicMock(side_effect=side_effect)
            UA.objects.count = MagicMock(return_value=10)
            UA.objects.distinct = MagicMock(return_value=["ES", "US"])
            UA.objects.order_by = MagicMock(
                return_value=MagicMock(
                    only=MagicMock(
                        return_value=MagicMock(first=MagicMock(return_value=latest))
                    )
                )
            )
            result = svc.get_usage_summary()

        assert result["unique_users"] == 10
        assert result["countries"] == 2
        assert result["returning_pct"] == 30.0
        assert "2026-01-01" in result["as_of"]

    def test_top_countries_limit(self):
        freqs = {"ES": 5, "US": 10, "FR": 1}
        with (
            patch.object(svc, "UserAnalytics") as UA,
            patch.object(svc, "item_frequencies", return_value=freqs),
        ):
            UA.objects.return_value = MagicMock()
            rows = svc.get_top_countries(limit=2)
        assert len(rows) == 2
        assert rows[0]["country"] == "US"
        assert rows[0]["unique_users"] == 10

    def test_capabilities_empty_and_populated(self):
        with patch.object(svc, "_rollup_or_none", return_value=None):
            empty = svc.get_usage_capabilities()
        assert empty == {"items": [], "as_of": None}

        rollup = MagicMock(
            by_capability={"search": 3, "download": 1},
            by_capability_requests={"search": 10, "download": 2},
            as_of=datetime(2026, 2, 1, tzinfo=timezone.utc),
        )
        with patch.object(svc, "_rollup_or_none", return_value=rollup):
            populated = svc.get_usage_capabilities()
        assert len(populated["items"]) >= 1
        assert populated["items"][0]["unique_users"] >= populated["items"][-1]["unique_users"]

    def test_top_entities_empty_and_capped(self):
        with patch.object(svc, "_rollup_or_none", return_value=None):
            empty = svc.get_top_entities()
        assert empty["top_assemblies"] == []

        rollup = MagicMock(
            top_assemblies=[{"id": str(i)} for i in range(15)],
            top_annotations=[],
            top_taxons=[],
            as_of=None,
        )
        with patch.object(svc, "_rollup_or_none", return_value=rollup):
            populated = svc.get_top_entities()
        assert len(populated["top_assemblies"]) == 10

    def test_country_frequencies_and_top_visitors(self):
        with (
            patch.object(svc, "UserAnalytics") as UA,
            patch.object(svc, "item_frequencies", return_value={"ES": 2}),
        ):
            UA.objects.return_value = MagicMock()
            assert svc.get_country_frequencies() == {"ES": 2}

        user = MagicMock(country="ES", visits_count=9)
        qs = MagicMock()
        qs.order_by.return_value.limit.return_value.only.return_value = [user]
        with patch.object(svc, "UserAnalytics") as UA:
            UA.objects.return_value = qs
            rows = svc.get_top_visitors(limit=1)
        assert rows == [{"country": "ES", "visits_count": 9}]
