import pytest

from jobs.services.utils import create_batches

pytestmark = pytest.mark.unit


class TestCreateBatches:
    def test_empty(self):
        assert create_batches([]) == []

    def test_exact_multiple(self):
        assert create_batches([1, 2, 3, 4], batch_size=2) == [[1, 2], [3, 4]]

    def test_remainder(self):
        assert create_batches([1, 2, 3, 4, 5], batch_size=2) == [
            [1, 2],
            [3, 4],
            [5],
        ]

    def test_custom_batch_size_default(self):
        items = list(range(250))
        batches = create_batches(items)
        assert len(batches) == 3
        assert len(batches[0]) == 100
        assert len(batches[-1]) == 50
