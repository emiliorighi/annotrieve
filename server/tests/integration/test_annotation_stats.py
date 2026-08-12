import pytest

from tests.integration.factories import make_annotation

pytestmark = pytest.mark.integration


class TestAnnotationStats:
    def test_gene_stats_summary(self, client):
        make_annotation(annotation_id="j" * 32, with_stats=True)
        resp = client.get("/annotations/gene-stats")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_annotations"] == 1
        assert "coding" in body["summary"]["genes"]
        assert body["summary"]["genes"]["coding"]["average_count"] == 100.0

    def test_busco_stats_summary(self, client):
        make_annotation(annotation_id="k" * 32, with_busco=True)
        resp = client.get("/annotations/busco-stats")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_annotations"] == 1
        assert body["summary"]["complete"]["mean"] == 90.0

    def test_transcript_stats_empty_smoke(self, client):
        # mongomock lacks $reduce used when transcript_type_stats are present;
        # empty queryset still exercises the HTTP → service path.
        resp = client.get("/annotations/transcript-stats")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total_annotations"] == 0
        assert body["summary"]["types"] == {}
        assert "metrics" in body
