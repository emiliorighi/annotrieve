from db.models import TaxonNode,Organism


def save_taxons_and_update_hierachy(parsed_taxons, organism_obj):
    save_parsed_taxons(parsed_taxons)
    ordered_nodes = get_and_order_saved_taxon_nodes(organism_obj)
    update_taxon_hierarchy(ordered_nodes)
    

def save_parsed_taxons(parsed_taxons):
    existing_taxids = TaxonNode.objects(taxid__in=[t.taxid for t in parsed_taxons]).scalar('taxid')
    taxons_to_save = [taxon for taxon in parsed_taxons if taxon.taxid not in existing_taxids]
    if taxons_to_save:
        TaxonNode.objects.insert(taxons_to_save)


def get_and_order_saved_taxon_nodes(organism_obj):
    taxon_lineage = organism_obj.taxon_lineage
    # Retrieve the taxon nodes from the database
    taxon_nodes = TaxonNode.objects(taxid__in=taxon_lineage)
    
    # Create a dictionary for quick lookup
    taxon_node_dict = {node.taxid: node for node in taxon_nodes}
    
    # Order the taxon nodes based on the taxon_lineage
    ordered_taxon_list = [taxon_node_dict[taxid] for taxid in taxon_lineage if taxid in taxon_node_dict]

    return ordered_taxon_list

def update_taxon_hierarchy(ordered_nodes):
    for index in range(len(ordered_nodes) - 1):
        child_taxon = ordered_nodes[index]
        father_taxon = ordered_nodes[index + 1]
        leaves = count_leaves(father_taxon)
        father_taxon.modify(add_to_set__children=child_taxon.taxid, leaves=leaves)


def count_leaves(father_taxon):
    return Organism.objects(taxon_lineage=father_taxon.taxid, taxid__ne=father_taxon.taxid).count()


def dfs_generator_iterative(node):
    tree = {
        "name": node.name,
        "taxid": node.taxid,
        "rank": node.rank,
        "leaves": node.leaves,
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
                    "leaves": child.leaves,
                    "children": []
                }
                current_tree["children"].append(child_tree)
                stack.append((child, child_tree))

    return tree



def dfs_generator_from_taxid_list(node, taxid_list):
    tree = {
        "name": node.name,
        "taxid": node.taxid,
        "rank": node.rank,
        "leaves": node.leaves,
        "children": []
    }

    if node.children:
        children = TaxonNode.objects(taxid__in=node.children)
        for child in children:
            if child.taxid not in taxid_list:
                continue
            tree["children"].append(dfs_generator_from_taxid_list(child, taxid_list))
    
    return tree