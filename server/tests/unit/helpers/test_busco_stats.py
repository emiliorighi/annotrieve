import pytest
from fastapi import HTTPException

from helpers import busco_stats as busco_stats_helper

pytestmark = pytest.mark.unit


class FakeQuerySet:
    def __init__(self, total=5, aggregate_docs=None):
        self._total = total
        self._aggregate_docs = list(aggregate_docs or [])

    def count(self):
        return self._total

    def aggregate(self, _pipeline):
        return list(self._aggregate_docs)


class TestBuscoStats:
    def test_invalid_metric_raises_400(self):
        with pytest.raises(HTTPException) as ctx:
            busco_stats_helper.get_busco_metric_values("not_a_metric", FakeQuerySet())
        assert ctx.value.status_code == 400

    def test_summary_empty_aggregate(self):
        result = busco_stats_helper.get_busco_stats_summary(FakeQuerySet(total=3, aggregate_docs=[]))
        assert result["total_annotations"] == 3
        assert result["metrics"] == busco_stats_helper.BUSCO_METRICS
        for metric in busco_stats_helper.BUSCO_METRICS:
            assert result["summary"][metric]["mean"] is None
            assert result["summary"][metric]["annotations_count"] == 0
            assert result["summary"][metric]["missing_annotations_count"] == 3

    def test_summary_populated_aggregate(self):
        docs = [
            {
                "count": 2,
                "complete_avg": 95.555,
                "single_copy_avg": 90.0,
                "duplicated_avg": 5.0,
                "fragmented_avg": 2.0,
                "missing_avg": 1.0,
            }
        ]
        result = busco_stats_helper.get_busco_stats_summary(
            FakeQuerySet(total=4, aggregate_docs=docs)
        )
        assert result["summary"]["complete"]["mean"] == 95.56
        assert result["summary"]["complete"]["annotations_count"] == 2
        assert result["summary"]["complete"]["missing_annotations_count"] == 2

    def test_metric_values_delegates_to_response_helper(self, monkeypatch):
        called = {}

        def fake_response(annotations, field_path, include_annotations, **extra):
            called["field_path"] = field_path
            called["include"] = include_annotations
            called["extra"] = extra
            return {"values": [1.0], **extra}

        monkeypatch.setattr(
            "helpers.busco_stats.response_helper.metric_values_response",
            fake_response,
        )
        out = busco_stats_helper.get_busco_metric_values(
            "complete", FakeQuerySet(), include_annotations=True
        )
        assert called["field_path"] == "busco.complete"
        assert called["include"] is True
        assert out["values"] == [1.0]
        assert out["metric"] == "complete"
