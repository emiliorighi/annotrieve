from pathlib import Path

import pytest

from jobs.services.assembly_summary import (
    _ftp_path_valid,
    _parse_header,
    build_ftp_path_index,
)

pytestmark = pytest.mark.unit


class TestAssemblySummary:
    def test_parse_header(self):
        header = _parse_header("#assembly_accession\tftp_path\tother")
        assert header["assembly_accession"] == 0
        assert header["ftp_path"] == 1

    def test_ftp_path_valid(self):
        assert _ftp_path_valid("/genomes/all/GCA/x") is True
        assert _ftp_path_valid("na") is False
        assert _ftp_path_valid("N/A") is False

    def test_build_ftp_path_index(self, tmp_path: Path):
        summary = tmp_path / "assembly_summary_genbank.txt"
        summary.write_text(
            "## comment\n"
            "#assembly_accession\tftp_path\n"
            "GCA_000001405.29\t/genomes/all/GCA/000/001/405/GCA_000001405.29_GRCh38\n"
            "GCA_NA\tna\n",
            encoding="utf-8",
        )
        # build_ftp_path_index expects files under summaries dir with known names
        index = {}
        from jobs.services import assembly_summary as asm_sum

        with pytest.MonkeyPatch.context() as mp:
            mp.setattr(
                asm_sum,
                "download_current_assembly_summaries",
                lambda *a, **k: None,
            )
            # Call lower-level stream via build if possible — use _stream_file_ftp_paths
            asm_sum._stream_file_ftp_paths(
                str(summary),
                target_accessions=None,
                latest_only=True,
                index=index,
            )
        assert "GCA_000001405.29" in index
        assert "GCA_NA" not in index
