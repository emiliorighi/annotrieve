from db.models import TaxonNode
import os
import json
from helpers import taxonomy as taxonomy_helper


ROOT_NODE = os.getenv('ROOT_NODE')

def compute_tree():
    node = TaxonNode.objects(taxid=ROOT_NODE).first()
    if not node:
        print(f"Taxon root with taxid: {ROOT_NODE} not found")
        return
    tree = taxonomy_helper.dfs_generator_iterative(node)
    # Resolve the path to the static folder
    current_dir = os.path.dirname(os.path.abspath(__file__))
    static_dir = os.path.join(current_dir, '../static')
    
    # Ensure the static directory exists
    if not os.path.exists(static_dir):
        os.makedirs(static_dir)
    
    file_path = os.path.join(static_dir, 'tree.json')
    
    # Open the file in write mode ('w'), which creates or overwrites the file
    with open(file_path, 'w') as file:
        json.dump(tree, file, indent=4)

    print(f"Tree has been written to {file_path}")
