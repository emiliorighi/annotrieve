import os
from unittest.mock import patch

import pytest

from helpers import flattened_taxonomy_export as flat

pytestmark = pytest.mark.unit


class TestFlattenedTaxonomyExportHelpers:
    def test_fields_non_empty_and_stable_prefix(self):
        assert len(flat.FLATTENED_TREE_FIELDS) >= 10
        assert flat.FLATTENED_TREE_FIELDS[:3] == [
            "taxid",
            "parent_taxid",
            "scientific_name",
        ]

    def test_file_path_uses_base_dir(self):
        path = flat.get_flattened_tree_file_path("tsv", base_dir="/tmp/ann")
        assert path == "/tmp/ann/taxonomy/flattened-tree.tsv"
        path_json = flat.get_flattened_tree_file_path("json", base_dir="/tmp/ann")
        assert path_json.endswith("flattened-tree.json")

    def test_public_url_default_and_override(self):
        assert (
            flat.get_flattened_tree_public_url("tsv")
            == "/annotrieve/files/taxonomy/flattened-tree.tsv"
        )
        with patch.dict(os.environ, {"PUBLIC_FILES_BASE": "/files"}):
            assert (
                flat.get_flattened_tree_public_url("json")
                == "/files/taxonomy/flattened-tree.json"
            )

    def test_stats_mean_missing_returns_zero(self):
        assert flat._stats_mean({}, "genes", "coding", "count", "mean") == 0.0
        assert flat._stats_mean({"stats": None}, "busco", "missing", "mean") == 0.0

    def test_stats_mean_nested(self):
        doc = {"stats": {"genes": {"coding": {"count": {"mean": 12.5}}}}}
        assert flat._stats_mean(doc, "genes", "coding", "count", "mean") == 12.5

    def test_doc_to_json_row_and_tsv_alignment(self):
        doc = {
            "taxid": "9606",
            "parent_id": "9605",
            "scientific_name": "Homo sapiens",
            "annotations_count": 2,
            "assemblies_count": 1,
            "organisms_count": 1,
            "rank": "species",
            "stats": {
                "genes": {"coding": {"count": {"mean": 3}}},
                "busco": {"single_copy": {"mean": 90}},
            },
        }
        row = flat.doc_to_json_row(doc)
        assert len(row) == len(flat.FLATTENED_TREE_FIELDS)
        assert row[0] == "9606"
        assert row[1] == "9605"
        assert row[2] == "Homo sapiens"
        assert row[7] == 3.0
        line = flat.doc_to_tsv_line(doc)
        cols = line.rstrip("\n").split("\t")
        assert len(cols) == len(flat.FLATTENED_TREE_FIELDS)
        assert cols[0] == "9606"
        assert cols[1] == "9605"

    def test_empty_parent_in_tsv(self):
        doc = {
            "taxid": "2759",
            "parent_id": None,
            "scientific_name": "Eukaryota",
            "rank": "superkingdom",
        }
        row = flat.doc_to_json_row(doc)
        assert row[1] is None
        cols = flat.doc_to_tsv_line(doc).rstrip("\n").split("\t")
        assert cols[1] == ""
