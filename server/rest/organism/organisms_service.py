
from db.models import TaxonNode, Organism, Assembly,GenomeAnnotation
from helpers import taxonomy as taxonomy_helper, data as data_helper
from werkzeug.exceptions import BadRequest, NotFound
import os 

ROOT_NODE=os.getenv('ROOT_NODE')
PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')

MODEL_LIST = {
    'assemblies':{'model':Assembly, 'id':'accession'},
    'annotations':{'model':GenomeAnnotation, 'id':'name'},
    }

def get_organisms(args):
    return data_helper.get_items('organisms', args)

def get_organism(taxid):
    organism = Organism.objects(taxid=taxid).first()
    if not organism:
        raise NotFound(description=f"Organism {taxid} not found!")
    return organism

def get_organism_related_data(taxid, model):

    get_organism(taxid)

    if not model in MODEL_LIST.keys():
        raise BadRequest(description=f"{model} is not in {' '.join(MODEL_LIST.keys)}")
    
    mapped_model = MODEL_LIST.get(model)
    return mapped_model.get('model').objects(taxid=taxid)

#map lineage into tree structure
def map_organism_lineage(lineage):
    root_to_organism = list(reversed(lineage))
    tree={}
    root = TaxonNode.objects(taxid=root_to_organism[0]).first()
    tree = taxonomy_helper.dfs_generator(root)
    return tree
