from db.models import TaxonNode

def dfs_generator_iterative(node):
    tree = {
        "scientific_name": node.name,
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
                    "scientific_name": child.scientific_name,
                    "taxid": child.taxid,
                    "rank": child.rank,
                    "children": []
                }
                current_tree["children"].append(child_tree)
                stack.append((child, child_tree))

    return tree
