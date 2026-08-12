from unittest.mock import MagicMock, patch

import pytest

from jobs.services import taxonomy as tax_svc

pytestmark = pytest.mark.unit


class TestTaxonomyJobHelpers:
    def test_update_taxon_hierarchy(self):
        child = MagicMock(taxid="9606")
        parent = MagicMock(taxid="9605")
        tax_svc.update_taxon_hierarchy([child, parent])
        parent.modify.assert_called_once_with(add_to_set__children="9606")
        child.modify.assert_called_once_with(set__parent_id="9605")

    def test_rebuild_taxon_hierarchy_from_lineages(self):
        # Minimal: empty aggregates → no relationships; still completes
        with (
            patch.object(tax_svc, "GenomeAssembly") as GAsm,
            patch.object(tax_svc, "GenomeAnnotation") as GA,
            patch.object(tax_svc, "Organism") as Org,
            patch.object(tax_svc, "TaxonNode") as TN,
            patch.object(tax_svc, "create_batches", return_value=[]),
        ):
            GAsm.objects.aggregate.return_value = []
            GA.objects.aggregate.return_value = []
            Org.objects.aggregate.return_value = []
            TN.objects.return_value = []
            TN.objects.aggregate.return_value = []
            # Function may also query all taxids — keep returns empty-safe
            result = tax_svc.rebuild_taxon_hierarchy_from_lineages()
        # Function returns None; just ensure no exception
        assert result is None
