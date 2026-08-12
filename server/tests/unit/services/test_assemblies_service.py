from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.responses import FileResponse

from services import assemblies_service as svc
from tests.unit.fakes import FakeQuerySet

pytestmark = pytest.mark.unit


class TestAssembliesService:
    def test_list_pagination(self):
        qs = FakeQuerySet([{"assembly_accession": "GCA_1"}], total=1)
        with patch.object(svc, "GenomeAssembly") as GA:
            GA.objects.return_value = qs
            result = svc.get_assemblies(offset=0, limit=20)
        assert result["total"] == 1
        assert len(result["results"]) == 1

    def test_invalid_report_status_400(self):
        qs = FakeQuerySet([])
        with patch.object(svc, "GenomeAssembly") as GA:
            GA.objects.return_value = qs
            with pytest.raises(HTTPException) as ctx:
                svc.get_assemblies(report_status="nope")
        assert ctx.value.status_code == 400

    def test_frequencies_requires_field(self):
        qs = FakeQuerySet([])
        with patch.object(svc, "GenomeAssembly") as GA:
            GA.objects.return_value = qs
            with pytest.raises(HTTPException) as ctx:
                svc.get_assemblies(response_type="frequencies")
        assert ctx.value.status_code == 400

    def test_get_404(self):
        qs = FakeQuerySet([])
        with patch.object(svc, "GenomeAssembly") as GA:
            GA.objects.return_value = qs
            with pytest.raises(HTTPException) as ctx:
                svc.get_assembly("missing")
        assert ctx.value.status_code == 404

    def test_paired_missing_404(self):
        asm = MagicMock(paired_assembly_accession=None)
        with patch.object(svc, "get_assembly", return_value=asm):
            with pytest.raises(HTTPException) as ctx:
                svc.get_paired_assembly("GCA_1")
        assert ctx.value.status_code == 404

    def test_paired_happy(self):
        primary = MagicMock(paired_assembly_accession="GCF_1")
        paired = MagicMock(assembly_accession="GCF_1")
        with patch.object(svc, "get_assembly", side_effect=[primary, paired]):
            result = svc.get_paired_assembly("GCA_1")
        assert result is paired

    def test_chromosomes_file_missing(self):
        asm = MagicMock(taxid="9606", paired_assembly_accession=None)
        with (
            patch.object(svc, "get_assembly", return_value=asm),
            patch.object(svc.seq_files, "resolve_chromosomes_path", return_value="/x.json"),
            patch.object(svc.os.path, "isfile", return_value=False),
        ):
            with pytest.raises(HTTPException) as ctx:
                svc.get_chromosomes_file("GCA_1")
        assert ctx.value.status_code == 404

    def test_chromosomes_file_ok(self, tmp_path):
        path = tmp_path / "chromosomes.json"
        path.write_text("[]")
        asm = MagicMock(taxid="9606", paired_assembly_accession=None)
        with (
            patch.object(svc, "get_assembly", return_value=asm),
            patch.object(svc.seq_files, "resolve_chromosomes_path", return_value=str(path)),
            patch.object(svc.os.path, "isfile", return_value=True),
        ):
            result = svc.get_chromosomes_file("GCA_1")
        assert isinstance(result, FileResponse)

    def test_chr_aliases_file_missing(self):
        asm = MagicMock(taxid="9606", paired_assembly_accession=None)
        with (
            patch.object(svc, "get_assembly", return_value=asm),
            patch.object(svc.seq_files, "resolve_chr_aliases_path", return_value=None),
        ):
            with pytest.raises(HTTPException) as ctx:
                svc.get_chr_aliases_file("GCA_1")
        assert ctx.value.status_code == 404
