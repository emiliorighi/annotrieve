import pytest

from tests.integration.factories import make_annotation

pytestmark = pytest.mark.integration


class TestAnnotationsList:
    def test_empty_list(self, client):
        resp = client.get("/annotations")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 0
        assert body["results"] == []
        assert body["limit"] == 20
        assert body["offset"] == 0

    def test_seeded_list_and_filter(self, client):
        make_annotation(annotation_id="c" * 32, provider="NCBI", taxid="9606")
        make_annotation(
            annotation_id="d" * 32,
            provider="Ensembl",
            taxid="10090",
            assembly_accession="GCA_000001635.9",
            organism_name="Mus musculus",
        )

        resp = client.get("/annotations", params={"limit": 10, "offset": 0})
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 2
        assert len(body["results"]) == 2

        filtered = client.get("/annotations", params={"taxids": "9606"})
        assert filtered.status_code == 200
        assert filtered.json()["total"] == 1
        assert filtered.json()["results"][0]["taxid"] == "9606"

    def test_post_list(self, client):
        make_annotation(annotation_id="e" * 32)
        resp = client.post("/annotations", json={"limit": 5})
        assert resp.status_code == 200
        assert resp.json()["total"] == 1
