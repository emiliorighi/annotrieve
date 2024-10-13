from db.models import TaxonNode
from helpers import taxonomy as taxonomy_helper
from werkzeug.exceptions import NotFound
from flask import Response, send_file
import json
import os

ROOT_NODE = os.getenv('ROOT_NODE')


def get_root_tree():
    node = TaxonNode.objects(taxid=ROOT_NODE).first()
    if not node:
        raise NotFound(description=f"{ROOT_NODE} not found!")
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    static_dir = os.path.join(current_dir, '../../static')
    file_path = os.path.join(static_dir, 'tree.json')
    
    if os.path.isfile(file_path):
        return send_file(file_path, mimetype='application/json')
    
    cached_tree = cache.get('cached_tree_data')
    
    if cached_tree is None:
        # If not cached, compute the tree
        node = TaxonNode.objects(taxid=ROOT_NODE).first()
        if not node:
            raise NotFound(description=f"Taxon {ROOT_NODE} not found!")
        
        # Generate the tree (this is the expensive operation)
        tree = taxonomy_helper.dfs_generator_iterative(node)
        
        # Cache the tree data
        cache.set('cached_tree_data', tree, timeout=3600)
    else:
        # Use the cached tree data
        tree = cached_tree
    return Response(json.dumps(tree), mimetype='application/json')



# def get_closest_taxon(taxid):
    
#     taxon = TaxonNode.objects(taxid=taxid).exclude('id').first()
    
#     if taxon:
#         return taxon, 200
    
#     organism, parsed_taxons = organism_helper.retrieve_taxonomic_info(taxid)
#     if not organism:
#         return f"Taxon with taxid {taxid} not found in INSDC", 400
    
#     existing_taxons = TaxonNode.objects(taxid__in=[node.taxid for node in parsed_taxons]).exclude('id')
    
#     for node in parsed_taxons:
#         taxid = node.get('taxId')
#         for ex_taxon in existing_taxons:
#             if taxid == ex_taxon.taxid:
#                 return ex_taxon, 200


