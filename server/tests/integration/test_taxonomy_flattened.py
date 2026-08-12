import pytest

from tests.integration.factories import make_taxon, write_prebuilt_flattened_tree

pytestmark = pytest.mark.integration


class TestTaxonomyFlattened:
    def test_json_fallback_without_prebuilt(self, client):
        make_taxon(taxid="9606", scientific_name="Homo sapiens", parent_id="9605")
        make_taxon(taxid="9605", scientific_name="Homo", parent_id="1", children=["9606"])
        resp = client.get("/taxons/flattened-tree", params={"format": "json"})
        assert resp.status_code == 200
        body = resp.json()
        assert "fields" in body
        assert "rows" in body
        assert any("9606" in (row if isinstance(row, list) else [row]) for row in body["rows"]) or any(
            "Homo sapiens" in str(row) for row in body["rows"]
        )

    def test_prebuilt_redirect(self, client):
        write_prebuilt_flattened_tree("json")
        resp = client.get(
            "/taxons/flattened-tree",
            params={"format": "json"},
            follow_redirects=False,
        )
        assert resp.status_code == 307
        assert "flattened-tree.json" in resp.headers.get("location", "")
