import pytest

from tests.integration.factories import (
    make_assembly,
    write_assembly_sequence_files,
)

pytestmark = pytest.mark.integration


class TestAssemblies:
    def test_list_and_detail(self, client):
        make_assembly(accession="GCA_000001405.29")
        resp = client.get("/assemblies")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1

        detail = client.get("/assemblies/GCA_000001405.29")
        assert detail.status_code == 200
        assert detail.json()["assembly_accession"] == "GCA_000001405.29"

    def test_detail_404(self, client):
        assert client.get("/assemblies/GCA_MISSING").status_code == 404

    def test_paired(self, client):
        make_assembly(
            accession="GCA_000001405.29",
            paired="GCF_000001405.40",
        )
        make_assembly(
            accession="GCF_000001405.40",
            paired="GCA_000001405.29",
            download_url="https://example.com/ftp/GCF_000001405.40",
        )
        resp = client.get("/assemblies/GCA_000001405.29/paired")
        assert resp.status_code == 200
        assert resp.json()["assembly_accession"] == "GCF_000001405.40"

    def test_chromosomes_and_aliases(self, client):
        make_assembly(accession="GCA_000001405.29", taxid="9606")
        write_assembly_sequence_files("9606", "GCA_000001405.29")
        chrom = client.get("/assemblies/GCA_000001405.29/assembled-molecules")
        assert chrom.status_code == 200
        aliases = client.get("/assemblies/GCA_000001405.29/chr-aliases")
        assert aliases.status_code == 200
        assert "chr1" in aliases.text

    def test_chromosomes_missing_404(self, client):
        make_assembly(accession="GCA_000001405.29", taxid="9606")
        resp = client.get("/assemblies/GCA_000001405.29/assembled-molecules")
        assert resp.status_code == 404
