from db.models import  TaxonNode
from helpers import data as data_helper, taxonomy as taxonomy_helper
from werkzeug.exceptions import NotFound
import os
import time
from jobs import taxonomy
from flask import send_file, Response
import json

STATIC_DIR = os.getenv('STATIC_DIR')

def get_taxons(args):
    return data_helper.get_items('taxons', args)

def get_taxon(taxid):
    taxid = str(taxid)
    taxon = TaxonNode.objects(taxid=taxid).first()
    if not taxon:
        raise NotFound(description=f"Taxon {taxid} not found!")
    return taxon

def get_taxon_children(taxid):
    taxid = str(taxid)
    taxon = get_taxon(taxid)
    children = TaxonNode.objects(taxid__in=taxon.children).exclude('id')
    return children

def get_taxon_ancestors(taxid):
    taxid = str(taxid)
    taxon = get_taxon(taxid)
    ancestors = [taxon.to_mongo().to_dict()]
    parent = TaxonNode.objects(children=taxid).exclude('id').first()
    while parent:
        ancestors.append(parent.to_mongo().to_dict())
        parent = TaxonNode.objects(children=parent.taxid).exclude('id').first()
    ancestors.reverse()
    # Filter out the root node (taxid = 1)
    ancestors = [ancestor for ancestor in ancestors]
    return data_helper.dump_json(ancestors)
    
def get_closest_taxon(taxid):
    taxid = str(taxid)
    ##check it taxon exists otherwise fetch lineage from INSDC
    taxon = TaxonNode.objects(taxid=taxid).first()
    if not taxon:
        ordered_taxons = taxonomy_helper.retrieve_taxons(taxid) ##from root to target taxid
        if not ordered_taxons:
            raise NotFound(description=f"Taxon {taxid} not found in INSDC!")
        #find the closest taxon in the reversed ordered taxons list
        for taxon in ordered_taxons.reverse():
            closest_taxon = TaxonNode.objects(taxid=taxon.taxid).first()
            if closest_taxon:
                return closest_taxon.to_json()
        raise NotFound(description=f"Taxon {taxid} not found in INSDC!")

def get_taxon_lineage(taxid):
    taxon = TaxonNode.objects(taxid=taxid).first()
    if not taxon:
        raise NotFound(description=f"Taxon {taxid} not found!")

def get_taxonomy_tree():
    file_path = os.path.join(STATIC_DIR, 'tree.json')

    # Freshness threshold
    now = time.time()
    one_day_seconds = 24 * 60 * 60

    if os.path.exists(file_path):
        # Check if file is fresh
        modified_time = os.path.getmtime(file_path)
        if now - modified_time < one_day_seconds:
            return send_file(file_path, mimetype='application/json')

    # File missing or stale → regenerate
    taxonomy.compute_tree()  # This function must write tree.json synchronously
    if os.path.exists(file_path):
        return send_file(file_path, mimetype='application/json')
    else:
        return Response(json.dumps({"error": "Tree file generation failed"}), mimetype='application/json', status=500)