from db.models import TaxonNode
from lxml import etree


def parse_taxons_from_ncbi_datasets(taxonomy_nodes):
    parsed_taxons = []
    for taxonomy_node in taxonomy_nodes:
        tax_node = taxonomy_node.get('taxonomy')
        taxid = str(tax_node.get('tax_id'))
        scientific_name = tax_node.get('current_scientific_name').get('name')
        rank = tax_node.get('rank').lower() if tax_node.get('rank') else 'other'
        parsed_taxons.append(TaxonNode(taxid=taxid,name=scientific_name,rank=rank))
    return parsed_taxons

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
    return organism, taxon_lineage

def parse_taxons_from_ena_browser(xml):
    root = etree.fromstring(xml)
    organisms=[]
    lineages=[]
    for node in root:
        organism = node.attrib
        lineage = [organism]
        for taxon in node:
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
        organisms.append(organism)
        lineages.append(taxon_lineage)
    return organisms, lineages

def parse_taxon_from_ena_portal(taxon):
    parsed_taxon = {}
    parsed_taxon['name'] = taxon.get('scientific_name')
    parsed_taxon['rank'] = taxon.get('rank')
    parsed_taxon['taxid'] = taxon.get('tax_id')
    return TaxonNode(**parsed_taxon)