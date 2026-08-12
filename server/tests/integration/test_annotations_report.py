import pytest

from tests.integration.factories import make_annotation, make_assembly

pytestmark = pytest.mark.integration


class TestAnnotationsReport:
    def test_default_tsv_header(self, client):
        make_annotation(annotation_id="f" * 32)
        resp = client.get("/annotations/report")
        assert resp.status_code == 200
        assert "text/tab-separated-values" in resp.headers["content-type"]
        text = resp.text
        header = text.splitlines()[0]
        assert "annotation_id" in header
        assert "assembly_accession" in header
        assert ("f" * 32) in text

    def test_selected_fields_with_assembly_join(self, client):
        make_assembly(accession="GCA_000001405.29", refseq_category="reference genome")
        make_annotation(annotation_id="g" * 32, assembly_accession="GCA_000001405.29")
        # selected_fields may only list extended columns (defaults always included).
        resp = client.post(
            "/annotations/report",
            json={
                "selected_fields": [
                    "assembly_refseq_category",
                    "assembly_download_url",
                ]
            },
        )
        assert resp.status_code == 200, resp.text
        lines = resp.text.splitlines()
        header = lines[0].split("\t")
        assert "annotation_id" in header  # default column
        assert "assembly_refseq_category" in header
        assert "assembly_download_url" in header
        row = lines[1].split("\t")
        assert "reference genome" in row
        assert any("example.com" in cell for cell in row)
