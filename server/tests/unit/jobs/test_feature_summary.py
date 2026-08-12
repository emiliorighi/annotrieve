import pytest

from jobs.services.feature_summary import _compute_features_summary_from_lines

pytestmark = pytest.mark.unit

GFF_LINES = [
    "chr1\tRefSeq\tgene\t1\t100\t.\t+\t.\tID=gene1;biotype=protein_coding",
    "chr1\tRefSeq\tmRNA\t1\t100\t.\t+\t.\tID=tx1;Parent=gene1",
    "chr1\tRefSeq\texon\t1\t50\t.\t+\t.\tID=exon1;Parent=tx1",
    "chr1\tRefSeq\tCDS\t1\t40\t.\t+\t0\tID=cds1;Parent=tx1",
    "chr1\tRefSeq\tgene\t200\t300\t.\t+\t.\tName=no_id",
    "# comment skipped because < 9 fields",
]


class TestComputeFeaturesSummaryFromLines:
    def test_types_sources_and_flags(self):
        summary = _compute_features_summary_from_lines(GFF_LINES)
        assert "gene" in summary.types
        assert "mRNA" in summary.types
        assert "exon" in summary.types
        assert "CDS" in summary.types
        assert "RefSeq" in summary.sources
        assert summary.has_cds is True
        assert summary.has_exon is True
        assert summary.has_biotype is True
        assert "protein_coding" in summary.biotypes

    def test_root_counts_and_missing_id(self):
        summary = _compute_features_summary_from_lines(GFF_LINES)
        assert summary.root_type_counts.get("gene", 0) >= 1
        assert "gene" in summary.types_missing_id
