import pytest

from tests.integration.factories import make_bioproject, make_organism

pytestmark = pytest.mark.integration


class TestOrganismsBioprojects:
    def test_organisms(self, client):
        make_organism(taxid="9606", organism_name="Homo sapiens")
        listing = client.get("/organisms")
        assert listing.status_code == 200
        assert listing.json()["total"] == 1

        detail = client.get("/organisms/9606")
        assert detail.status_code == 200
        assert detail.json()["organism_name"] == "Homo sapiens"

        assert client.get("/organisms/0000").status_code == 404

    def test_bioprojects(self, client):
        make_bioproject(accession="PRJNA999", title="Test project")
        listing = client.get("/bioprojects")
        assert listing.status_code == 200
        assert listing.json()["total"] == 1

        detail = client.get("/bioprojects/PRJNA999")
        assert detail.status_code == 200
        assert detail.json()["title"] == "Test project"

        assert client.get("/bioprojects/PRJNA000").status_code == 404
