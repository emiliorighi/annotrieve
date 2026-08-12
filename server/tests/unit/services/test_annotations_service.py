from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from services import annotations_service as svc
from tests.unit.fakes import FakeQuerySet

pytestmark = pytest.mark.unit


class TestAnnotationsService:
    def test_get_annotations_metadata(self):
        qs = FakeQuerySet([{"annotation_id": "a"}], total=1)
        with (
            patch.object(svc.annotation_helper, "get_annotation_records", return_value=qs),
        ):
            result = svc.get_annotations({"limit": 20, "offset": 0})
        assert result["total"] == 1
        assert len(result["results"]) == 1

    def test_get_annotations_frequencies(self):
        qs = FakeQuerySet([], total=0)
        with (
            patch.object(svc.annotation_helper, "get_annotation_records", return_value=qs),
            patch.object(
                svc.query_visitors_helper,
                "get_frequencies",
                return_value={"RefSeq": 3},
            ) as freqs,
        ):
            result = svc.get_annotations(
                {"limit": 20}, field="database", response_type="frequencies"
            )
        assert result == {"RefSeq": 3}
        freqs.assert_called_once()

    def test_get_annotations_tsv_branch(self):
        qs = FakeQuerySet([], total=0)
        stream = StreamingResponse(iter([b"x"]), media_type="text/tab-separated-values")
        with (
            patch.object(svc.annotation_helper, "get_annotation_records", return_value=qs),
            patch.object(svc, "stream_annotation_tsv", return_value=stream) as tsv,
        ):
            result = svc.get_annotations(
                {"selected_fields": "busco_complete"}, response_type="tsv"
            )
        assert result is stream
        tsv.assert_called_once()

    @pytest.mark.asyncio
    async def test_stream_annotation_tsv_joins_assembly_fields(self):
        qs = FakeQuerySet([["md5", "GCA_1"]], total=1)
        field_map = {"annotation_id": "annotation_id", "assembly_accession": "assembly_accession"}
        assembly_map = {"assembly_gc_percent": "gc_percent"}

        def fake_iter(_annotations, _paths, batch_size=5000):
            yield ["md5", "GCA_1"]

        with (
            patch.object(svc.tsv_fields_helper, "resolve_tsv_field_map", return_value=field_map),
            patch.object(
                svc.tsv_fields_helper,
                "resolve_assembly_tsv_field_map",
                return_value=assembly_map,
            ),
            patch.object(svc.tsv_fields_helper, "iter_tsv_rows", side_effect=fake_iter),
            patch.object(
                svc.tsv_fields_helper,
                "resolve_assembly_rows",
                return_value=[["42.0"]],
            ) as join,
            patch.object(
                svc.tsv_fields_helper,
                "format_tsv_cell",
                side_effect=lambda v, extended=False: str(v if v is not None else ""),
            ),
        ):
            resp = svc.stream_annotation_tsv(qs, selected_fields="assembly_gc_percent")
            assert isinstance(resp, StreamingResponse)
            async for _ in resp.body_iterator:
                pass
        join.assert_called_once()

    def test_get_annotation_404(self):
        with patch.object(svc, "GenomeAnnotation") as GA:
            GA.objects.return_value = FakeQuerySet([])
            with pytest.raises(HTTPException) as ctx:
                svc.get_annotation("missing")
        assert ctx.value.status_code == 404

    def test_get_annotation_metadata_happy(self):
        ann = MagicMock()
        ann.to_mongo.return_value.to_dict.return_value = {"annotation_id": "md5"}
        with patch.object(svc, "GenomeAnnotation") as GA:
            GA.objects.return_value = FakeQuerySet([ann])
            result = svc.get_annotation_metadata("md5")
        assert result["annotation_id"] == "md5"

    def test_tabix_no_filters_400(self):
        ann = MagicMock()
        with (
            patch.object(svc, "get_annotation", return_value=ann),
            patch.object(svc.file_helper, "get_annotation_file_path", return_value="/a.gff.gz"),
            patch.object(svc.os.path, "exists", return_value=True),
        ):
            with pytest.raises(HTTPException) as ctx:
                svc.stream_annotation_tabix("md5")
        assert ctx.value.status_code == 400

    def test_tabix_invalid_biotype_400(self):
        ann = MagicMock()
        ann.features_summary.biotypes = ["protein_coding"]
        ann.features_summary.types = ["gene"]
        ann.features_summary.sources = ["RefSeq"]
        with (
            patch.object(svc, "get_annotation", return_value=ann),
            patch.object(svc.file_helper, "get_annotation_file_path", return_value="/a.gff.gz"),
            patch.object(svc.os.path, "exists", return_value=True),
        ):
            with pytest.raises(HTTPException) as ctx:
                svc.stream_annotation_tabix("md5", biotype="nope")
        assert ctx.value.status_code == 400

    def test_tabix_missing_file_404(self):
        ann = MagicMock()
        with (
            patch.object(svc, "get_annotation", return_value=ann),
            patch.object(svc.file_helper, "get_annotation_file_path", return_value="/missing"),
            patch.object(svc.os.path, "exists", return_value=False),
        ):
            with pytest.raises(HTTPException) as ctx:
                svc.stream_annotation_tabix("md5", feature_type="gene")
        assert ctx.value.status_code == 404

    def test_gene_busco_summary_smoke(self):
        qs = FakeQuerySet([], total=0)
        with (
            patch.object(svc.params_helper, "handle_request_params", return_value={}),
            patch.object(svc.annotation_helper, "get_annotation_records", return_value=qs),
            patch.object(
                svc.feature_stats_helper,
                "get_gene_stats_summary",
                return_value={"total_annotations": 0},
            ) as gene,
            patch.object(
                svc.busco_stats_helper,
                "get_busco_stats_summary",
                return_value={"total_annotations": 0},
            ) as busco,
        ):
            assert svc.get_gene_stats_summary()["total_annotations"] == 0
            assert svc.get_busco_stats_summary()["total_annotations"] == 0
        gene.assert_called_once_with(qs)
        busco.assert_called_once_with(qs)

    def test_aggregates_by_taxon_rank(self):
        docs = [
            {
                "taxid": "9606",
                "taxon_name": "Homo sapiens",
                "annotations_count": 2,
                "avg_coding_genes_count": 1,
                "avg_non_coding_genes_count": 1,
                "avg_pseudogenes_count": 0,
            }
        ]
        with (
            patch.object(svc, "GenomeAnnotation") as GA,
            patch.object(
                svc.pipelines_helper,
                "aggregate_by_taxon_pipeline",
                return_value=[{"$match": {}}],
            ),
        ):
            GA.objects.aggregate.return_value = docs
            result = svc.get_annotations_aggregates_by_taxon_rank("species")
        assert result["fields"][0] == "taxid"
        assert result["rows"][0][0] == "9606"
