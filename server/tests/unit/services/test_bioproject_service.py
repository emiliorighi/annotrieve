from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from services import bioproject_service
from tests.unit.fakes import FakeQuerySet

pytestmark = pytest.mark.unit


class TestBioprojectService:
    def test_list_pagination_shape(self):
        items = [MagicMock(accession="PRJNA1")]
        qs = FakeQuerySet(items, total=1)
        with patch("services.bioproject_service.BioProject.objects", return_value=qs):
            result = bioproject_service.get_bioprojects(offset=0, limit=10)
        assert result["total"] == 1
        assert len(result["results"]) == 1

    def test_get_happy(self):
        bp = MagicMock(accession="PRJNA1")
        qs = FakeQuerySet([bp])
        with patch("services.bioproject_service.BioProject.objects", return_value=qs):
            result = bioproject_service.get_bioproject("PRJNA1")
        assert result is bp

    def test_get_404(self):
        qs = FakeQuerySet([])
        with patch("services.bioproject_service.BioProject.objects", return_value=qs):
            with pytest.raises(HTTPException) as ctx:
                bioproject_service.get_bioproject("missing")
        assert ctx.value.status_code == 404
