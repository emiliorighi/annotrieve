import pytest

from tests.integration.factories import make_annotation, write_contigs_for_annotation

pytestmark = pytest.mark.integration


class TestAnnotationDetail:
    def test_get_metadata(self, client):
        ann = make_annotation(annotation_id="h" * 32)
        resp = client.get(f"/annotations/{ann.annotation_id}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["annotation_id"] == ann.annotation_id
        assert body["taxid"] == "9606"

    def test_get_404(self, client):
        resp = client.get(f"/annotations/{'z' * 32}")
        assert resp.status_code == 404

    def test_contigs_stream(self, client):
        ann = make_annotation(annotation_id="i" * 32)
        write_contigs_for_annotation(ann, ["chr1", "chrX"])
        resp = client.get(f"/annotations/{ann.annotation_id}/contigs")
        assert resp.status_code == 200
        assert "chr1" in resp.text
        assert "chrX" in resp.text
