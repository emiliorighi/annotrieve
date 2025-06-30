from db.models import TaxonNode
from lxml import etree

def parse_taxons_from_ncbi_datasets(taxonomy_nodes, target_taxid):
    """
    Parse taxons from NCBI Datasets API response and order them by lineage.

    Args:
        taxonomy_nodes: List of taxonomy nodes
        target_taxid: Target taxid to find in the taxonomy

    Returns:
        - List of TaxonNode objects (in lineage order)
        - List of taxon IDs in lineage
    """
    taxid_to_node = {}
    target_lineage = []

    for taxonomy_node in taxonomy_nodes:
        tax_node = taxonomy_node.get('taxonomy')
        taxid = str(tax_node.get('tax_id'))
        scientific_name = tax_node.get('current_scientific_name').get('name')
        rank = tax_node.get('rank').lower() if tax_node.get('rank') else 'other'

        taxid_to_node[taxid] = TaxonNode(taxid=taxid, name=scientific_name, rank=rank)

        if taxid == target_taxid:
            # Save the parent lineage for ordering
            target_lineage = [str(tid) for tid in tax_node.get('parents', [])]

    # Include the target taxid itself at the end
    full_lineage = target_lineage + [target_taxid]

    # Reconstruct ordered taxons
    ordered_taxons = [taxid_to_node[tid] for tid in full_lineage if tid in taxid_to_node]
    return ordered_taxons


def parse_taxon_from_ena_browser(xml):
    root = etree.fromstring(xml)
    organism = root[0].attrib
    lineage = [organism]
    for taxon in root[0]:
        if taxon.tag == 'lineage':
            for node in taxon:
                lineage.append(node.attrib)
    taxon_lineage = []
    for node in lineage:
        if node['scientificName'] == 'root':
            continue
        rank = node['rank'] if 'rank' in node.keys() else 'other'
        taxon_node = TaxonNode(taxid=node['taxId'], name=node['scientificName'], rank=rank)
        taxon_lineage.append(taxon_node)
    ## reverse the lineage
    taxon_lineage.reverse()
    return taxon_lineage

def parse_taxon_from_ena_portal(taxon):
    parsed_taxon = {}
    parsed_taxon['name'] = taxon.get('scientific_name')
    parsed_taxon['rank'] = taxon.get('rank')
    parsed_taxon['taxid'] = taxon.get('tax_id')
    return TaxonNode(**parsed_taxon)