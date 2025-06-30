from db.models import TaxonNode
import os
import json
from helpers import taxonomy as taxonomy_helper


ROOT_NODE = os.getenv('ROOT_NODE') #Eukaryota
STATIC_DIR = os.getenv('STATIC_DIR')

#sync function to compute the tree and save it to the static folder
def compute_tree():
    node = TaxonNode.objects(taxid=ROOT_NODE).first()
    if not node:
        print(f"Taxon root with taxid: {ROOT_NODE} not found")
        return
    tree = taxonomy_helper.dfs_generator_iterative(node)
    # Resolve the path to the static folder
    file_path = os.path.join(STATIC_DIR, 'tree.json')
    #create the static folder if it doesn't exist
    os.makedirs(STATIC_DIR, exist_ok=True)
    print(f"Saving tree to {file_path}")
    # Open the file in write mode ('w'), which creates or overwrites the file
    with open(file_path, 'w') as file:
        json.dump(tree, file, indent=4)
