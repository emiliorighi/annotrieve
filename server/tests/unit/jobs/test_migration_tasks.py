from unittest.mock import MagicMock, patch

import pytest

from jobs import migration as mig

pytestmark = pytest.mark.unit


class TestMigrationTasks:
    def test_unset_dry_run(self):
        with patch.object(
            mig.contigs_service,
            "count_genome_annotations_with_mapped_regions",
            return_value=5,
        ):
            with patch.object(
                mig.contigs_service, "unset_genome_annotation_mapped_regions"
            ) as unset:
                result = mig.unset_genome_annotation_mapped_regions_task(dry_run=True)
        assert result == {"dry_run": True, "matching": 5, "modified": 0}
        unset.assert_not_called()

    def test_unset_apply(self):
        with (
            patch.object(
                mig.contigs_service,
                "count_genome_annotations_with_mapped_regions",
                return_value=5,
            ),
            patch.object(
                mig.contigs_service,
                "unset_genome_annotation_mapped_regions",
                return_value=5,
            ),
        ):
            result = mig.unset_genome_annotation_mapped_regions_task(dry_run=False)
        assert result["dry_run"] is False
        assert result["modified"] == 5

    def test_backfill_placeholder_empty(self):
        with patch.object(mig, "GenomeAssembly") as GA:
            GA.objects.return_value.scalar.return_value = []
            result = mig.backfill_placeholder_assembly_download_urls()
        assert result == {"targets": 0}

    def test_backfill_placeholder_with_accessions(self):
        def objects_side_effect(**kwargs):
            m = MagicMock()
            if "assembly_accession__in" in kwargs:
                m.count.return_value = 0
                return m
            m.scalar.return_value = ["GCA_1"]
            return m

        with (
            patch.object(mig, "GenomeAssembly") as GA,
            patch.object(
                mig.assembly_service,
                "sync_assemblies_ftp_and_sequences",
                return_value={"ok": 1},
            ) as sync,
        ):
            GA.objects = MagicMock(side_effect=objects_side_effect)
            result = mig.backfill_placeholder_assembly_download_urls()
        sync.assert_called_once()
        assert result["still_placeholder"] == 0

    def test_backfill_taxon_parent_id(self):
        coll = MagicMock()
        coll.find.side_effect = [
            [{"taxid": "1", "children": ["2"]}],
            [],
        ]
        coll.bulk_write.return_value = MagicMock(modified_count=1)
        with patch.object(mig, "TaxonNode") as TN:
            TN._get_collection.return_value = coll
            result = mig.backfill_taxon_parent_id(batch_size=10)
        assert result["child_mappings"] == 1
        assert result["updated"] >= 1

    def test_remap_phase_order(self):
        phase = []

        class Droppable:
            objects = MagicMock()
            objects.count.return_value = 0

            @staticmethod
            def drop_collection():
                phase.append("drop")

        with (
            patch("db.models.AnnotationSequenceMap", Droppable),
            patch("db.models.GenomicSequence", Droppable),
            patch(
                "helpers.assembly_sequence_files.regenerate_all_contigs_txt",
                side_effect=lambda **k: phase.append("contigs") or {"n": 1},
            ),
            patch.object(
                mig.contigs_service,
                "count_genome_annotations_with_mapped_regions",
                return_value=0,
            ),
            patch.object(
                mig.contigs_service,
                "unset_genome_annotation_mapped_regions",
                side_effect=lambda: phase.append("unset") or 0,
            ),
            patch.object(
                mig.assembly_service,
                "sync_assemblies_ftp_and_sequences",
                side_effect=lambda **k: phase.append("sync") or {"targets": 0},
            ),
        ):
            result = mig.remap_all_assemblies_and_annotations(chunk_size=10)

        assert phase == ["drop", "drop", "contigs", "unset", "sync"]
        assert "collections_dropped" in result
        assert "assembly_sync" in result
