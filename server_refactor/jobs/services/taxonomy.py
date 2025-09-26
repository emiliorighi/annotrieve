from db.models import TaxonNode, Organism
from clients import ebi_client,ncbi_datasets
from lxml import etree

def handle_taxonomy(taxids_dict: dict) -> dict:
    """
    Fetch the taxonomy from the a dict of taxids (taxid:organism_name) and store the lineages in a dictionary taxid:lineage, return the lineages dict
    """
    lineages = dict()
    organisms_to_save = []
    taxids = list(taxids_dict.keys())
    existing_organisms = Organism.objects(taxid__in=taxids).scalar('taxid','taxon_lineage')
    print(f"Found {len(existing_organisms)} existing organisms")
    new_taxids = set(taxids) - set([t[0] for t in existing_organisms])
    
    #append existing organisms to the lineages
    for taxid, lineage in existing_organisms:
        lineages[taxid] = lineage

    for taxid in new_taxids:
        ordered_taxons = retrieve_taxons_and_save(taxid)
        if not ordered_taxons:
            continue
        lineages[taxid] = [taxon.taxid for taxon in ordered_taxons]
        organisms_to_save.append(Organism(
            taxid=taxid,
            organism_name=taxids_dict[taxid],
            taxon_lineage=lineages[taxid],
        ))
    print(f"Found {len(new_taxids)} new organisms to save")
    if organisms_to_save:
    #save new organisms
        print(f"Saving {len(organisms_to_save)} new organisms")
        try:
            Organism.objects.insert(organisms_to_save)
        except Exception as e:
            print(f"Error saving organisms: {e}")
    else:
        print(f"No new organisms to save")
    return lineages

def retrieve_taxons_and_save(taxid):

    ordered_taxons = retrieve_taxons(taxid)
    if ordered_taxons:
        reloaded_taxons = save_taxons_and_update_hierachy(ordered_taxons)
        return reloaded_taxons
    return None

def retrieve_taxons(taxid):
    data_sources = [
        get_info_from_ncbi,
        get_info_from_ena_browser,
        get_info_from_ena_portal
    ]
    
    for source in data_sources:
        ordered_taxons = source(taxid)
        if ordered_taxons:
            return ordered_taxons
    
    return None

#return ordered taxons from root to target taxid
def get_info_from_ncbi(taxid):
    args = ['taxonomy', 'taxon', taxid, '--parents']
    report = ncbi_datasets.get_data_from_ncbi(args)
    if report and report.get('reports'):
        ordered_taxons = parse_taxons_from_ncbi_datasets(report.get('reports'), taxid)
        return ordered_taxons
    return None

#return ordered taxons from root to target taxid
def get_info_from_ena_browser(taxid):
    taxon_xml = ebi_client.get_taxon_from_ena_browser(taxid)
    if taxon_xml:
        ordered_taxons = parse_taxon_from_ena_browser(taxon_xml)
        return ordered_taxons    
    return None

def get_info_from_ena_portal(taxid):
    taxon = ebi_client.get_taxon_from_ena_portal(taxid)
    if taxon:
        taxon_to_parse = taxon[0]
        lineage = parse_lineage_from_ena_portal(taxon_to_parse)
        ordered_taxons = [parse_taxon_from_ena_portal(taxon_to_parse)]
        for lineage_taxid in lineage:
            if lineage_taxid != taxid:
                lineage_taxon = ebi_client.get_taxon_from_ena_portal(lineage_taxid)
                if lineage_taxon:
                    ordered_taxons.append(parse_taxon_from_ena_portal(lineage_taxon[0]))
        return ordered_taxons

##return ordered taxon ids from root to target taxid
def parse_lineage_from_ena_portal(organism_data):
    return [taxon_taxid.strip() for taxon_taxid in organism_data.get('tax_lineage').split(';')]

def save_taxons_and_update_hierachy(ordered_taxons):
    reloaded_taxons = save_parsed_taxons(ordered_taxons)
    update_taxon_hierarchy(reloaded_taxons)
    return reloaded_taxons

def save_parsed_taxons(ordered_taxons):
    existing_taxids = TaxonNode.objects(taxid__in=[t.taxid for t in ordered_taxons]).scalar('taxid')
    taxons_to_save = [taxon for taxon in ordered_taxons if taxon.taxid not in existing_taxids]
    if taxons_to_save:
        TaxonNode.objects.insert(taxons_to_save)
    
    # Reload all taxons from database to ensure they have proper database state
    taxids = [t.taxid for t in ordered_taxons]
    reloaded_taxons = TaxonNode.objects(taxid__in=taxids)
    
    # Return the reloaded taxons in the same order as the input
    taxon_map = {t.taxid: t for t in reloaded_taxons}
    return [taxon_map[t.taxid] for t in ordered_taxons]

def update_taxon_hierarchy(ordered_taxons):
    ordered_taxons.reverse()
    for index in range(len(ordered_taxons) - 1):
        child_taxon = ordered_taxons[index]
        father_taxon = ordered_taxons[index + 1]
        father_taxon.modify(add_to_set__children=child_taxon.taxid)

def get_lineages(annotations):
    """
    Fetch the lineages for the annotations and return them as a dict with taxid as key and lineage as value
    """
    taxids_to_fetch = {annotation.get('taxon_id'):annotation.get('organism_name') for annotation in annotations}
    valid_lineages = handle_taxonomy(taxids_to_fetch)
    return valid_lineages



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
        taxid = str(tax_node.get('taxid'))
        scientific_name = tax_node.get('current_scientific_name').get('name')
        rank = tax_node.get('rank').lower() if tax_node.get('rank') else 'other'

        taxid_to_node[taxid] = TaxonNode(taxid=taxid, scientific_name=scientific_name, rank=rank)

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
        taxon_node = TaxonNode(taxid=node['taxId'], scientific_name=node['scientificName'], rank=rank)
        taxon_lineage.append(taxon_node)
    ## reverse the lineage
    taxon_lineage.reverse()
    return taxon_lineage

def parse_taxon_from_ena_portal(taxon):
    parsed_taxon = {}
    parsed_taxon['scientific_name'] = taxon.get('scientific_name')
    parsed_taxon['rank'] = taxon.get('rank')
    parsed_taxon['taxid'] = taxon.get('taxid')
    return TaxonNode(**parsed_taxon)