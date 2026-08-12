from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.responses import RedirectResponse, StreamingResponse

from services import taxonomy_service as svc
from tests.unit.fakes import FakeQuerySet

pytestmark = pytest.mark.unit


class _QsKeepsSelf(FakeQuerySet):
    """as_pymongo returns self so service paths that call .count() after as_pymongo work."""

    def as_pymongo(self):
        return self

    def __len__(self):
        return self._total


class TestTaxonomyService:
    def test_list_uses_pagination_helper(self):
        qs = _QsKeepsSelf([{"taxid": "9606"}], total=1)
        with patch.object(svc, "TaxonNode") as TN:
            TN.objects.return_value = qs
            result = svc.get_taxon_nodes(offset=0, limit=20)
        assert result["total"] == 1
        assert result["results"] == [{"taxid": "9606"}]

    def test_get_happy_and_404(self):
        node = MagicMock(taxid="9606")
        with patch.object(svc, "TaxonNode") as TN:
            TN.objects.return_value = FakeQuerySet([node])
            assert svc.get_taxon_node("9606") is node
            TN.objects.return_value = FakeQuerySet([])
            with pytest.raises(HTTPException) as ctx:
                svc.get_taxon_node("missing")
        assert ctx.value.status_code == 404

    def test_children(self):
        parent = {"children": ["1", "2"]}
        children_qs = _QsKeepsSelf([{"taxid": "1"}, {"taxid": "2"}], total=2)
        with (
            patch.object(svc, "get_taxon_node", return_value=parent),
            patch.object(svc, "TaxonNode") as TN,
        ):
            TN.objects.return_value = children_qs
            result = svc.get_taxon_node_children("9606")
        assert result["total"] == 2

    def test_ancestors(self):
        leaf = MagicMock()
        leaf.to_mongo.return_value.to_dict.return_value = {"taxid": "9606"}
        leaf.taxid = "9606"
        parent = MagicMock()
        parent.to_mongo.return_value.to_dict.return_value = {"taxid": "1"}
        parent.taxid = "1"

        calls = {"n": 0}

        def objects_side_effect(**kwargs):
            calls["n"] += 1
            if "children" in kwargs:
                if calls["n"] == 1:
                    return FakeQuerySet([parent])
                return FakeQuerySet([])
            return FakeQuerySet([leaf])

        with (
            patch.object(svc, "get_taxon_node", return_value=leaf),
            patch.object(svc, "TaxonNode") as TN,
        ):
            TN.objects.side_effect = objects_side_effect
            result = svc.get_ancestors("9606")
        assert result["total"] == 2
        assert result["results"][0]["taxid"] == "1"
        assert result["results"][1]["taxid"] == "9606"

    def test_flattened_tree_prebuilt_redirect(self):
        redirect = RedirectResponse(url="/files/x", status_code=307)
        with patch.object(svc, "_get_prebuilt_flattened_tree_response", return_value=redirect):
            result = svc.get_flattened_tree("json")
        assert result is redirect
        assert result.status_code == 307

    def test_flattened_tree_json_fallback(self):
        coll = MagicMock()
        coll.find.return_value = []
        coll.aggregate.return_value = [
            {
                "taxid": "9606",
                "parent_id": "9605",
                "scientific_name": "Homo sapiens",
                "annotations_count": 1,
                "assemblies_count": 1,
                "organisms_count": 1,
                "rank": "species",
            }
        ]
        with (
            patch.object(svc, "_get_prebuilt_flattened_tree_response", return_value=None),
            patch.object(svc, "TaxonNode") as TN,
        ):
            TN._get_collection.return_value = coll
            result = svc.get_flattened_tree("json")
        assert "fields" in result
        assert len(result["rows"]) == 1
        assert result["rows"][0][0] == "9606"

    def test_flattened_tree_tsv_fallback(self):
        coll = MagicMock()
        coll.find.return_value = []
        coll.aggregate.return_value = [
            {
                "taxid": "1",
                "parent_id": None,
                "scientific_name": "Root",
                "annotations_count": 0,
                "assemblies_count": 0,
                "organisms_count": 0,
                "rank": "no rank",
            }
        ]
        with (
            patch.object(svc, "_get_prebuilt_flattened_tree_response", return_value=None),
            patch.object(svc, "TaxonNode") as TN,
        ):
            TN._get_collection.return_value = coll
            result = svc.get_flattened_tree("tsv")
        assert isinstance(result, StreamingResponse)
