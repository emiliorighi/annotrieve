from db.models import TaxonNode
from clients import ebi_client,ncbi_datasets
from parsers import taxonomy as taxonomy_parser

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
        ordered_taxons = taxonomy_parser.parse_taxons_from_ncbi_datasets(report.get('reports'), taxid)
        return ordered_taxons
    return None

#return ordered taxons from root to target taxid
def get_info_from_ena_browser(taxid):
    taxon_xml = ebi_client.get_taxon_from_ena_browser(taxid)
    if taxon_xml:
        ordered_taxons = taxonomy_parser.parse_taxon_from_ena_browser(taxon_xml)
        return ordered_taxons    
    return None

def get_info_from_ena_portal(taxid):
    taxon = ebi_client.get_taxon_from_ena_portal(taxid)
    if taxon:
        taxon_to_parse = taxon[0]
        lineage = parse_lineage_from_ena_portal(taxon_to_parse)
        ordered_taxons = [taxonomy_parser.parse_taxon_from_ena_portal(taxon_to_parse)]
        for lineage_taxid in lineage:
            if lineage_taxid != taxid:
                lineage_taxon = ebi_client.get_taxon_from_ena_portal(lineage_taxid)
                if lineage_taxon:
                    ordered_taxons.append(taxonomy_parser.parse_taxon_from_ena_portal(lineage_taxon[0]))
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

def dfs_generator_iterative(node):
    tree = {
        "name": node.name,
        "taxid": node.taxid,
        "rank": node.rank,
        "children": []
    }

    stack = [(node, tree)]

    while stack:
        current_node, current_tree = stack.pop()
        if current_node.children:
            children = TaxonNode.objects(taxid__in=current_node.children)
            for child in children:
                child_tree = {
                    "name": child.name,
                    "taxid": child.taxid,
                    "rank": child.rank,
                    "children": []
                }
                current_tree["children"].append(child_tree)
                stack.append((child, child_tree))

    return tree
