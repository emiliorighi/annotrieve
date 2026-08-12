from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from services import organism_service
from tests.unit.fakes import FakeQuerySet

pytestmark = pytest.mark.unit


class TestOrganismService:
    def test_list_pagination_shape(self):
        items = [MagicMock(taxid="9606"), MagicMock(taxid="10090")]
        qs = FakeQuerySet(items, total=2)
        with patch("services.organism_service.Organism.objects", return_value=qs):
            result = organism_service.get_organisms(offset=0, limit=20)
        assert result["total"] == 2
        assert result["offset"] == 0
        assert result["limit"] == 20
        assert len(result["results"]) == 2

    def test_get_happy(self):
        org = MagicMock(taxid="9606")
        qs = FakeQuerySet([org])
        with patch("services.organism_service.Organism.objects", return_value=qs):
            result = organism_service.get_organism("9606")
        assert result is org

    def test_get_404(self):
        qs = FakeQuerySet([])
        with patch("services.organism_service.Organism.objects", return_value=qs):
            with pytest.raises(HTTPException) as ctx:
                organism_service.get_organism("missing")
        assert ctx.value.status_code == 404
