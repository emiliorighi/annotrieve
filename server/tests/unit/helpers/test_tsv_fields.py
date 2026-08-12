import json
import unittest
from datetime import date, datetime
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from helpers import constants as constants_helper
from helpers import tsv_fields as tsv_fields_helper

pytestmark = pytest.mark.unit


class ResolveTsvFieldMapTests(unittest.TestCase):
    def test_none_returns_frozen_default_map(self):
        result = tsv_fields_helper.resolve_tsv_field_map(None)
        self.assertEqual(result, constants_helper.FIELD_TSV_MAP)
        self.assertEqual(list(result.keys()), list(constants_helper.FIELD_TSV_MAP.keys()))

    def test_empty_string_returns_default_map(self):
        result = tsv_fields_helper.resolve_tsv_field_map("")
        self.assertEqual(result, constants_helper.FIELD_TSV_MAP)

    def test_appends_extended_fields_in_definition_order(self):
        result = tsv_fields_helper.resolve_tsv_field_map("busco_complete,taxon_lineage")
        default_keys = list(constants_helper.FIELD_TSV_MAP.keys())
        self.assertEqual(list(result.keys())[: len(default_keys)], default_keys)
        self.assertIn("taxon_lineage", result)
        self.assertIn("busco_complete", result)
        taxon_index = list(result.keys()).index("taxon_lineage")
        busco_index = list(result.keys()).index("busco_complete")
        self.assertLess(taxon_index, busco_index)

    def test_rejects_unknown_field(self):
        with self.assertRaises(HTTPException) as ctx:
            tsv_fields_helper.resolve_tsv_field_map("not_a_real_field")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_rejects_default_field_in_selected_fields(self):
        with self.assertRaises(HTTPException) as ctx:
            tsv_fields_helper.resolve_tsv_field_map("annotation_id,release_date")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("annotation_id", ctx.exception.detail)

    def test_ignores_duplicate_tokens(self):
        result = tsv_fields_helper.resolve_tsv_field_map("release_date,release_date")
        self.assertEqual(list(result.keys()).count("release_date"), 1)

    def test_accepts_assembly_field_without_adding_it(self):
        # Assembly-derived keys are valid tokens but resolve_tsv_field_map only
        # owns the GenomeAnnotation-side map; they must not leak in here.
        result = tsv_fields_helper.resolve_tsv_field_map("assembly_download_url,taxon_lineage")
        self.assertNotIn("assembly_download_url", result)
        self.assertIn("taxon_lineage", result)


class ResolveAssemblyTsvFieldMapTests(unittest.TestCase):
    def test_none_returns_empty(self):
        self.assertEqual(tsv_fields_helper.resolve_assembly_tsv_field_map(None), {})

    def test_empty_string_returns_empty(self):
        self.assertEqual(tsv_fields_helper.resolve_assembly_tsv_field_map(""), {})

    def test_extended_only_selection_returns_empty(self):
        result = tsv_fields_helper.resolve_assembly_tsv_field_map("taxon_lineage,busco_complete")
        self.assertEqual(result, {})

    def test_selected_assembly_fields_returned_in_declaration_order(self):
        result = tsv_fields_helper.resolve_assembly_tsv_field_map(
            "assembly_gc_percent,assembly_refseq_category"
        )
        self.assertEqual(
            list(result.keys()),
            ["assembly_refseq_category", "assembly_gc_percent"],
        )
        self.assertEqual(result["assembly_refseq_category"], "refseq_category")
        self.assertEqual(result["assembly_gc_percent"], "assembly_stats__gc_percent")

    def test_mixed_extended_and_assembly_fields(self):
        result = tsv_fields_helper.resolve_assembly_tsv_field_map(
            "taxon_lineage,assembly_download_url"
        )
        self.assertEqual(result, {"assembly_download_url": "download_url"})

    def test_rejects_unknown_field(self):
        with self.assertRaises(HTTPException) as ctx:
            tsv_fields_helper.resolve_assembly_tsv_field_map("not_a_real_field")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_rejects_default_field_in_selected_fields(self):
        with self.assertRaises(HTTPException) as ctx:
            tsv_fields_helper.resolve_assembly_tsv_field_map("assembly_accession")
        self.assertEqual(ctx.exception.status_code, 400)


class _FakeAssemblyQuerySet:
    """Minimal stand-in for the mongoengine QuerySet chain used in resolve_assembly_rows."""

    def __init__(self, docs):
        self._docs = docs

    def only(self, *_args, **_kwargs):
        return self

    def as_pymongo(self):
        return iter(self._docs)


class ResolveAssemblyRowsTests(unittest.TestCase):
    def setUp(self):
        self.field_map = {
            "assembly_refseq_category": "refseq_category",
            "assembly_download_url": "download_url",
            "assembly_gc_percent": "assembly_stats__gc_percent",
        }

    def test_returns_empty_tuples_when_no_field_map(self):
        batch = [("annotation_1", "GCA_000001"), ("annotation_2", "GCA_000002")]
        result = tsv_fields_helper.resolve_assembly_rows(batch, accession_index=1, assembly_field_map={})
        self.assertEqual(result, [(), ()])

    def test_joins_values_by_accession_with_single_batched_query(self):
        docs = [
            {
                "assembly_accession": "GCA_000001",
                "refseq_category": "reference genome",
                "download_url": "https://ftp.ncbi.nlm.nih.gov/genomes/all/GCA_000001.fna.gz",
                "assembly_stats": {"gc_percent": 41},
            },
            {
                "assembly_accession": "GCA_000002",
                "refseq_category": "representative genome",
                "download_url": "https://ftp.ncbi.nlm.nih.gov/genomes/all/GCA_000002.fna.gz",
                "assembly_stats": {"gc_percent": 38},
            },
        ]
        batch = [("annotation_1", "GCA_000001"), ("annotation_2", "GCA_000002")]

        with patch.object(
            tsv_fields_helper.GenomeAssembly, "objects", return_value=_FakeAssemblyQuerySet(docs)
        ) as mocked_objects:
            result = tsv_fields_helper.resolve_assembly_rows(batch, accession_index=1, assembly_field_map=self.field_map)
            mocked_objects.assert_called_once()

        self.assertEqual(
            result,
            [
                ("reference genome", "https://ftp.ncbi.nlm.nih.gov/genomes/all/GCA_000001.fna.gz", 41),
                ("representative genome", "https://ftp.ncbi.nlm.nih.gov/genomes/all/GCA_000002.fna.gz", 38),
            ],
        )

    def test_missing_assembly_resolves_to_none_values(self):
        batch = [("annotation_1", "GCA_missing")]
        with patch.object(tsv_fields_helper.GenomeAssembly, "objects", return_value=_FakeAssemblyQuerySet([])):
            result = tsv_fields_helper.resolve_assembly_rows(batch, accession_index=1, assembly_field_map=self.field_map)
        self.assertEqual(result, [(None, None, None)])

    def test_placeholder_download_url_becomes_none(self):
        docs = [
            {
                "assembly_accession": "GCA_pending",
                "refseq_category": None,
                "download_url": f"{constants_helper.PLACEHOLDER_DOWNLOAD_URL_PREFIX}GCA_pending",
                "assembly_stats": None,
            }
        ]
        batch = [("annotation_1", "GCA_pending")]
        with patch.object(tsv_fields_helper.GenomeAssembly, "objects", return_value=_FakeAssemblyQuerySet(docs)):
            result = tsv_fields_helper.resolve_assembly_rows(
                batch,
                accession_index=1,
                assembly_field_map={"assembly_download_url": "download_url"},
            )
        self.assertEqual(result, [(None,)])

    def test_no_accessions_in_batch_skips_query_entirely(self):
        batch = [("annotation_1", None), ("annotation_2", "")]
        with patch.object(tsv_fields_helper.GenomeAssembly, "objects") as mocked_objects:
            result = tsv_fields_helper.resolve_assembly_rows(batch, accession_index=1, assembly_field_map=self.field_map)
        mocked_objects.assert_not_called()
        self.assertEqual(result, [(None, None, None), (None, None, None)])


class DigMongoValueTests(unittest.TestCase):
    def test_top_level_present(self):
        self.assertEqual(
            tsv_fields_helper.dig_mongo_value({"annotation_id": "abc"}, "annotation_id"),
            "abc",
        )

    def test_top_level_missing(self):
        self.assertIsNone(tsv_fields_helper.dig_mongo_value({}, "annotation_id"))

    def test_nested_missing_middle_key(self):
        doc = {"source_file_info": {"database": "GenBank"}}
        self.assertIsNone(
            tsv_fields_helper.dig_mongo_value(doc, "source_file_info__pipeline__name")
        )

    def test_nested_none_middle(self):
        doc = {"source_file_info": {"pipeline": None}}
        self.assertIsNone(
            tsv_fields_helper.dig_mongo_value(doc, "source_file_info__pipeline__name")
        )

    def test_nested_fully_present(self):
        doc = {"source_file_info": {"pipeline": {"name": "BRAKER3"}}}
        self.assertEqual(
            tsv_fields_helper.dig_mongo_value(doc, "source_file_info__pipeline__name"),
            "BRAKER3",
        )

    def test_list_and_dict_leaves_pass_through(self):
        doc = {
            "taxon_lineage": ["9606", "9605"],
            "features_summary": {"root_type_counts": {"gene": 3}},
        }
        self.assertEqual(
            tsv_fields_helper.dig_mongo_value(doc, "taxon_lineage"),
            ["9606", "9605"],
        )
        self.assertEqual(
            tsv_fields_helper.dig_mongo_value(
                doc, "features_summary__root_type_counts"
            ),
            {"gene": 3},
        )


class FormatTsvCellTests(unittest.TestCase):
    def test_default_path_matches_str_behavior(self):
        self.assertEqual(tsv_fields_helper.format_tsv_cell(None), "")
        self.assertEqual(tsv_fields_helper.format_tsv_cell("value"), "value")
        self.assertEqual(tsv_fields_helper.format_tsv_cell(42), "42")

    def test_extended_path_formats_complex_values(self):
        self.assertEqual(tsv_fields_helper.format_tsv_cell(True, extended=True), "true")
        self.assertEqual(tsv_fields_helper.format_tsv_cell(False, extended=True), "false")
        self.assertEqual(
            tsv_fields_helper.format_tsv_cell(["gene", "exon"], extended=True),
            "gene;exon",
        )
        self.assertEqual(
            tsv_fields_helper.format_tsv_cell({"gene": 3}, extended=True),
            json.dumps({"gene": 3}, separators=(",", ":")),
        )
        dt = datetime(2024, 5, 1, 12, 30, 0)
        self.assertEqual(tsv_fields_helper.format_tsv_cell(dt, extended=True), dt.isoformat())
        self.assertEqual(
            tsv_fields_helper.format_tsv_cell(date(2024, 5, 1), extended=True),
            "2024-05-01",
        )
        self.assertEqual(tsv_fields_helper.format_tsv_cell(None, extended=True), "")


if __name__ == "__main__":
    unittest.main()
