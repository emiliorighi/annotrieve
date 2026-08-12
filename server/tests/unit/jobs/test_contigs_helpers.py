from unittest.mock import MagicMock, patch

import pytest

from jobs.services import contigs as contigs_svc

pytestmark = pytest.mark.unit


class TestContigsHelpers:
    def test_count(self):
        with patch.object(contigs_svc, "GenomeAnnotation") as GA:
            GA.objects.return_value.count.return_value = 4
            assert contigs_svc.count_genome_annotations_with_mapped_regions() == 4

    def test_unset_returns_modified_count(self):
        result = MagicMock(modified_count=7)
        with patch.object(contigs_svc, "GenomeAnnotation") as GA:
            GA._get_collection.return_value.update_many.return_value = result
            assert contigs_svc.unset_genome_annotation_mapped_regions() == 7
