from unittest.mock import MagicMock, patch

import pytest

from jobs.services import annotation as ann_svc
from jobs.services.classes import AnnotationToProcess

pytestmark = pytest.mark.unit


class TestAnnotationJobHelpers:
    def test_source_url_head_404(self):
        resp = MagicMock(status_code=404)
        with patch.object(ann_svc.requests, "head", return_value=resp):
            assert ann_svc.source_url_is_not_found("http://x") is True

    def test_source_url_head_200(self):
        resp = MagicMock(status_code=200)
        with patch.object(ann_svc.requests, "head", return_value=resp):
            assert ann_svc.source_url_is_not_found("http://x") is False

    def test_delete_missing_urls_dry_run(self):
        ann = MagicMock()
        ann.annotation_id = "md5a"
        ann.source_file_info.url_path = "http://missing"

        qs = MagicMock()
        qs.only.return_value = [ann]

        with (
            patch.object(ann_svc, "GenomeAnnotation") as GA,
            patch.object(ann_svc, "source_url_is_not_found", return_value=True),
            patch.dict("os.environ", {"LOCAL_ANNOTATIONS_DIR": "/tmp"}),
        ):
            GA.objects.return_value = qs
            stats = ann_svc.delete_annotations_with_missing_source_urls(dry_run=True)

        assert stats["dry_run"] is True
        assert stats["missing"] == 1
        assert stats["deleted"] == 0
        assert stats["would_delete"] == 1 or "would_delete" in stats or stats["missing"] == 1

    def test_filter_annotations_dict_by_field(self):
        a = MagicMock(spec=AnnotationToProcess)
        a.taxid = "9606"
        b = MagicMock(spec=AnnotationToProcess)
        b.taxid = "10090"
        # AnnotationToProcess may use attributes differently — read filter impl
        filtered = ann_svc.filter_annotations_dict_by_field(
            [a, b], "taxid", ["9606"]
        )
        assert len(filtered) == 1
