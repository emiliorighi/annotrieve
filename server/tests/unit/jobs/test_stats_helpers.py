from unittest.mock import MagicMock, patch

import pytest

from jobs.services import stats as stats_svc

pytestmark = pytest.mark.unit


class TestStatsHelpers:
    def test_distribution_empty_odd_even(self):
        empty = stats_svc.compute_distribution_stats([])
        assert empty.n == 0
        assert empty.mean == 0

        odd = stats_svc.compute_distribution_stats([1, 3, 2])
        assert odd.median == 2
        assert odd.n == 3

        even = stats_svc.compute_distribution_stats([1, 2, 3, 4])
        assert even.median == 2.5
        assert even.min == 1
        assert even.max == 4

    def test_update_assemblies_counts_rollup(self):
        assembly = MagicMock(assembly_accession="GCA_1")
        orphan_qs = MagicMock()
        orphan_qs.count.return_value = 0

        def asm_objects(*args, **kwargs):
            if kwargs.get("annotations_count") == 0:
                return orphan_qs
            return [assembly]

        with (
            patch.object(stats_svc, "GenomeAnnotation") as GA,
            patch.object(stats_svc, "GenomeAssembly") as GAsm,
        ):
            GA.objects.aggregate.return_value = [{"_id": "GCA_1", "count": 3}]
            GAsm.objects = MagicMock(side_effect=asm_objects)
            stats_svc.update_assemblies_counts()

        assembly.modify.assert_called_once_with(annotations_count=3)
        orphan_qs.delete.assert_not_called()
