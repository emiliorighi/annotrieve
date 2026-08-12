import importlib
from unittest.mock import MagicMock, patch

import pytest

from jobs.services.classes import AnnotationToProcess

imp = importlib.import_module("jobs.import_annotations")

pytestmark = pytest.mark.unit


def _ann(**kwargs):
    defaults = dict(
        md5_checksum="m1",
        taxon_id="9606",
        assembly_accession="GCA_1",
        access_url="https://example.com/a.gff",
    )
    defaults.update(kwargs)
    return AnnotationToProcess(**defaults)


class TestImportAnnotationsTask:
    def test_early_exit_after_empty_lineage_filter(self, monkeypatch):
        monkeypatch.setattr(imp, "DEV", "1")
        with (
            patch.object(imp.annotation_service, "fetch_from_url", return_value=[_ann()]),
            patch.object(
                imp.annotation_service,
                "filter_annotations_by_md5_checksum_and_url_path",
                side_effect=lambda xs: xs,
            ),
            patch.object(imp, "random") as rnd,
            patch.object(
                imp.taxonomy_service, "handle_taxonomy", return_value={}
            ) as tax,
            patch.object(
                imp.annotation_service,
                "filter_annotations_dict_by_field",
                return_value=[],
            ) as filt,
            patch.object(imp.assembly_service, "handle_assemblies") as assemblies,
        ):
            rnd.sample.side_effect = lambda xs, n: xs
            result = imp.import_annotations()
        tax.assert_called_once()
        filt.assert_called_once()
        assemblies.assert_not_called()
        assert result is None

    def test_early_exit_after_empty_assembly_filter(self, monkeypatch):
        monkeypatch.setattr(imp, "DEV", "1")
        anns = [_ann()]
        with (
            patch.object(imp.annotation_service, "fetch_from_url", return_value=anns),
            patch.object(
                imp.annotation_service,
                "filter_annotations_by_md5_checksum_and_url_path",
                side_effect=lambda xs: xs,
            ),
            patch.object(imp, "random") as rnd,
            patch.object(
                imp.taxonomy_service,
                "handle_taxonomy",
                return_value={"9606": ["1", "9606"]},
            ),
            patch.object(
                imp.annotation_service,
                "filter_annotations_dict_by_field",
                side_effect=[anns, []],
            ),
            patch.object(
                imp.assembly_service,
                "handle_assemblies",
                return_value=(["GCA_1"], []),
            ) as assemblies,
            patch.object(imp, "GenomeAnnotation") as GA,
        ):
            rnd.sample.side_effect = lambda xs, n: xs
            result = imp.import_annotations()
        assemblies.assert_called_once()
        GA.objects.assert_not_called()
        assert result is None

    def test_pipeline_smoke_saves_and_delays(self, monkeypatch):
        monkeypatch.setattr(imp, "DEV", "1")
        monkeypatch.setattr(imp, "ANNOTATIONS_PATH", "/ann")
        monkeypatch.setattr(imp, "BATCH_SIZE", 10)
        anns = [_ann()]
        processed = [MagicMock(name="GenomeAnnotation")]

        with (
            patch.object(imp.annotation_service, "fetch_from_url", return_value=anns),
            patch.object(
                imp.annotation_service,
                "filter_annotations_by_md5_checksum_and_url_path",
                side_effect=lambda xs: xs,
            ),
            patch.object(imp, "random") as rnd,
            patch.object(
                imp.taxonomy_service,
                "handle_taxonomy",
                return_value={"9606": ["1", "9606"]},
            ),
            patch.object(
                imp.annotation_service,
                "filter_annotations_dict_by_field",
                side_effect=[anns, anns],
            ),
            patch.object(
                imp.assembly_service,
                "handle_assemblies",
                return_value=(["GCA_1"], ["GCA_1"]),
            ),
            patch.object(imp, "GenomeAnnotation") as GA,
            patch.object(
                imp, "process_annotations_pipeline", return_value=processed
            ) as pipeline,
            patch.object(imp.annotation_service, "save_annotations") as save,
            patch.object(imp.annotation_service, "clean_up_annotations_with_errors"),
            patch.object(imp.annotation_service, "delete_annotations"),
            patch.object(imp.stats_service, "update_db_stats"),
            patch.object(imp.stats_service, "update_taxon_gene_and_transcript_stats"),
            patch(
                "jobs.assemblies.sync_new_assemblies_from_summary.delay"
            ) as sync_delay,
            patch("jobs.taxonomy.export_flattened_taxonomy.delay") as export_delay,
        ):
            rnd.sample.side_effect = lambda xs, n: xs
            GA.objects.return_value.scalar.return_value = []
            imp.import_annotations()

        pipeline.assert_called_once()
        save.assert_called_once_with(processed, "/ann")
        sync_delay.assert_called_once_with(accessions=["GCA_1"])
        export_delay.assert_called_once()
