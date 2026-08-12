from unittest.mock import MagicMock, patch

import pytest

from jobs import updates as upd

pytestmark = pytest.mark.unit


class TestUpdatesTasks:
    def test_prune_dry_run_skips_stats(self):
        with (
            patch.object(
                upd.annotation_service,
                "delete_annotations_with_missing_source_urls",
                return_value={"would_delete": 3},
            ) as prune,
            patch.object(upd.stats_service, "update_db_stats") as db_stats,
            patch.object(upd.stats_service, "update_taxon_gene_and_transcript_stats"),
            patch.object(upd.stats_service, "update_taxons_busco_scores"),
        ):
            result = upd.prune_annotations_missing_source_url(dry_run=True)
        prune.assert_called_once_with(dry_run=True)
        db_stats.assert_not_called()
        assert result == {"would_delete": 3}

    def test_prune_apply_refreshes_stats(self):
        with (
            patch.object(
                upd.annotation_service,
                "delete_annotations_with_missing_source_urls",
                return_value={"deleted": 2},
            ),
            patch.object(upd.stats_service, "update_db_stats") as db_stats,
            patch.object(upd.stats_service, "update_taxon_gene_and_transcript_stats") as gene,
            patch.object(upd.stats_service, "update_taxons_busco_scores") as busco,
        ):
            result = upd.prune_annotations_missing_source_url(dry_run=False)
        db_stats.assert_called_once()
        gene.assert_called_once()
        busco.assert_called_once()
        assert result["stats_refreshed"] is True
        assert result["deleted"] == 2

    def test_update_busco_scores_skip_when_none_missing(self):
        with (
            patch.object(upd, "GenomeAnnotation") as GA,
            patch("jobs.updates.requests.get") as get,
        ):
            GA.objects.return_value.scalar.return_value = []
            result = upd.update_busco_scores()
        assert result is None
        get.assert_not_called()

    def test_update_records_early_exit_no_assemblies(self):
        with (
            patch.object(upd, "GenomeAssembly") as GA,
            patch.object(upd.assembly_service, "update_assemblies_from_ncbi") as update,
        ):
            GA.objects.return_value.scalar.return_value = []
            result = upd.update_records()
        assert result is None
        update.assert_not_called()

    def test_update_taxon_stats_calls_helpers(self):
        with (
            patch.object(upd.stats_service, "update_taxon_gene_and_transcript_stats") as gene,
            patch.object(upd, "schedule_flattened_taxonomy_export") as export,
        ):
            upd.update_taxon_stats()
        gene.assert_called_once()
        export.assert_called_once()

    def test_update_taxons_busco_scores_job(self):
        with (
            patch.object(upd.stats_service, "update_taxons_busco_scores") as busco,
            patch.object(upd, "schedule_flattened_taxonomy_export") as export,
        ):
            upd.update_taxons_busco_scores_job()
        busco.assert_called_once()
        export.assert_called_once()
