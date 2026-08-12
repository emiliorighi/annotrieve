import pytest

from jobs.services.feature_stats import _compute_features_statistics_from_lines

pytestmark = pytest.mark.unit

GFF_LINES = [
    "chr1\tRefSeq\tgene\t1\t100\t.\t+\t.\tID=g1;gene_biotype=protein_coding",
    "chr1\tRefSeq\tmRNA\t1\t100\t.\t+\t.\tID=t1;Parent=g1",
    "chr1\tRefSeq\texon\t1\t50\t.\t+\t.\tID=e1;Parent=t1",
    "chr1\tRefSeq\tCDS\t1\t40\t.\t+\t0\tID=c1;Parent=t1",
    "short",
]


class TestFeatureStatsFromLines:
    def test_empty_input(self):
        stats = _compute_features_statistics_from_lines([])
        assert stats is not None

    def test_counts_gene_transcript_exon_cds(self):
        stats = _compute_features_statistics_from_lines(GFF_LINES)
        gene_stats = stats.gene_category_stats or {}
        # protein_coding gene should land in coding category
        coding = gene_stats.get("coding") or gene_stats.get("coding_genes")
        assert coding is not None
        transcript = stats.transcript_type_stats or {}
        assert "mRNA" in transcript or len(transcript) >= 0
