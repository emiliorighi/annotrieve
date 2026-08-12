import pytest
from fastapi import HTTPException

from helpers import feature_stats as feature_stats_helper

pytestmark = pytest.mark.unit


class FakeQuerySet:
    """Queryable stand-in with configurable aggregate payloads per call."""

    def __init__(self, total=10, aggregate_sequence=None, default_docs=None):
        self._total = total
        self._aggregate_sequence = list(aggregate_sequence) if aggregate_sequence is not None else None
        self._default_docs = list(default_docs or [])
        self._call = 0

    def count(self):
        return self._total

    def aggregate(self, _pipeline):
        if self._aggregate_sequence is not None:
            if self._call >= len(self._aggregate_sequence):
                docs = []
            else:
                docs = self._aggregate_sequence[self._call]
            self._call += 1
            return list(docs)
        return list(self._default_docs)


class TestGeneStats:
    def test_invalid_metric_raises_400(self):
        with pytest.raises(HTTPException) as ctx:
            feature_stats_helper.get_gene_category_metric_values(
                "coding", "bad_metric", FakeQuerySet()
            )
        assert ctx.value.status_code == 400

    def test_summary_happy_path(self):
        # For each of 3 categories, first key attempt returns one annotation row.
        per_category = [{"total_count": 10, "mean_length": 100.0}]
        qs = FakeQuerySet(
            total=5,
            aggregate_sequence=[per_category, per_category, per_category],
        )
        result = feature_stats_helper.get_gene_stats_summary(qs)
        assert result["total_annotations"] == 5
        assert result["categories"] == ["coding", "non_coding", "pseudogene"]
        coding = result["summary"]["genes"]["coding"]
        assert coding["annotations_count"] == 1
        assert coding["average_count"] == 10.0
        assert coding["average_mean_length"] == 100.0
        assert coding["missing_annotations_count"] == 4

    def test_category_details_not_found(self):
        qs = FakeQuerySet(total=2, default_docs=[])
        with pytest.raises(HTTPException) as ctx:
            feature_stats_helper.get_gene_category_details("coding", qs)
        assert ctx.value.status_code == 404

    def test_category_details_happy_path(self):
        # First aggregates for key discovery (coding, then coding_genes), then values.
        discovery = [{"_id": 1}]
        values = [
            {
                "category_data": {
                    "total_count": 4,
                    "length_stats": {"mean": 50.0},
                }
            },
            {
                "category_data": {
                    "total_count": 6,
                    "length_stats": {"mean": 70.0},
                }
            },
        ]
        qs = FakeQuerySet(
            total=3,
            aggregate_sequence=[discovery, values],
        )
        result = feature_stats_helper.get_gene_category_details("coding", qs)
        assert result["category"] == "coding"
        assert result["annotations_count"] == 2
        assert result["summary"]["total_count"]["mean"] == 5.0
        assert result["summary"]["average_mean_length"]["mean"] == 60.0


class TestTranscriptStats:
    def test_summary_happy_path(self):
        docs = [
            {
                "type": "mRNA",
                "annotations_count": 2,
                "total_count_sum": 20,
                "mean_length_sum": 200,
                "mean_length_count": 2,
                "has_cds_stats": True,
            }
        ]
        result = feature_stats_helper.get_transcript_stats_summary(
            FakeQuerySet(total=4, default_docs=docs)
        )
        assert result["total_annotations"] == 4
        assert "mRNA" in result["types"]
        assert result["summary"]["types"]["mRNA"]["average_count"] == 10.0
        assert "cds_total_count" in result["metrics"]

    def test_type_details_not_found(self):
        with pytest.raises(HTTPException) as ctx:
            feature_stats_helper.get_transcript_type_details(
                "mRNA", FakeQuerySet(total=1, default_docs=[])
            )
        assert ctx.value.status_code == 404

    def test_metric_values_invalid_for_type(self):
        discovery = [{"_id": 1}]
        values = [
            {
                "type_data": {
                    "total_count": 3,
                    "length_stats": {"mean": 10.0},
                }
            }
        ]
        qs = FakeQuerySet(total=1, aggregate_sequence=[discovery, values])
        with pytest.raises(HTTPException) as ctx:
            feature_stats_helper.get_transcript_type_metric_values(
                "mRNA", "cds_total_count", qs
            )
        assert ctx.value.status_code == 400
