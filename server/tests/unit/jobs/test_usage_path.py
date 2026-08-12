import pytest

from jobs.services.usage_path import PathClassification, classify_path, normalize_api_path

pytestmark = pytest.mark.unit


class TestNormalizeApiPath:
    def test_empty_returns_root(self):
        assert normalize_api_path("") == "/"

    def test_strips_query_and_api_prefix(self):
        assert (
            normalize_api_path("/annotrieve/api/v0/annotations?limit=10")
            == "/annotations"
        )

    def test_strips_api_v0_prefix(self):
        assert normalize_api_path("/api/v0/taxons/9606/") == "/taxons/9606"

    def test_collapses_duplicate_slashes(self):
        assert normalize_api_path("//annotations//") == "/annotations"


class TestClassifyPath:
    def test_jobs_and_analytics_are_other(self):
        assert classify_path("/jobs/update").capability == "other"
        assert classify_path("/analytics/summary").capability == "other"

    def test_upload_gff(self):
        assert classify_path("/annotations/upload-gff").capability == "upload"

    def test_download_report(self):
        result = classify_path("/annotations/report")
        assert result.capability == "download"

    def test_annotation_gff_download_with_entity(self):
        md5 = "a" * 32
        result = classify_path(f"/annotations/{md5}/gff")
        assert result == PathClassification(
            capability="download",
            entity_kind="annotation",
            entity_id=md5,
        )

    def test_browser_contigs(self):
        md5 = "b" * 32
        result = classify_path(f"/annotations/{md5}/contigs")
        assert result.capability == "browser"
        assert result.entity_kind == "annotation"
        assert result.entity_id == md5

    def test_stats_endpoints(self):
        assert classify_path("/annotations/gene-stats").capability == "stats"
        assert classify_path("/assemblies/frequencies/level").capability == "stats"

    def test_taxonomy_flattened_tree(self):
        result = classify_path("/taxons/flattened-tree")
        assert result.capability == "taxonomy"

    def test_taxon_children(self):
        result = classify_path("/taxons/9606/children")
        assert result.capability == "taxonomy"
        assert result.entity_kind == "taxon"
        assert result.entity_id == "9606"

    def test_search_list_roots(self):
        assert classify_path("/annotations").capability == "search"
        assert classify_path("/assemblies").capability == "search"

    def test_annotation_detail(self):
        md5 = "c" * 32
        result = classify_path(f"/annotations/{md5}")
        assert result == PathClassification(
            capability="entity_detail",
            entity_kind="annotation",
            entity_id=md5,
        )

    def test_assembly_detail(self):
        result = classify_path("/assemblies/GCA_000001405.29")
        assert result.capability == "entity_detail"
        assert result.entity_kind == "assembly"
        assert result.entity_id.startswith("GCA_")

    def test_unknown_is_other(self):
        assert classify_path("/unknown/thing").capability == "other"
