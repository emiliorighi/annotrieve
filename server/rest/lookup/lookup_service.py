from db.models import Assembly, GenomeAnnotation, Organism, Chromosome,TaxonNode
from werkzeug.exceptions import NotFound
from mongoengine.queryset.visitor import Q

CHUNK_LIMIT = 10000

MODEL_LIST = {
    'assemblies':Assembly,
    'annotations':GenomeAnnotation,
    'organisms':Organism,
    }

def get_instance_stats():
    response = {}
    for k,v in MODEL_LIST.items():
        counts = v.objects().count()
        response[k] = counts
    return response

def lookup_organism_data(taxid):
    organism = Organism.objects(taxid=taxid).first()
    if not organism:
        raise NotFound(description=f"Organism {taxid} not found")
    response = {}
    for key in MODEL_LIST:
        if key == 'organisms':
            continue
        response[key] = MODEL_LIST[key].objects(taxid=taxid).count()
    return response

def lookup_taxon_data(taxid):
    if not TaxonNode.objects(taxid=taxid).first():
        raise NotFound(description=f"Taxon {taxid} not found")
    response = {}
    for k,v in MODEL_LIST.items():
        response[k] = v.objects(taxon_lineage=taxid).count()
    return response

def lookup_assembly_data(accession):
    assembly = Assembly.objects(accession=accession).first()
    if not assembly:
        raise NotFound(description=f"Assembly {accession} not found")
    annotations = GenomeAnnotation.objects(assembly_accession=accession).count()
    chromosomes = Chromosome.objects(accession_version__in=assembly.chromosomes).count()
    return dict(annotations=annotations,chromosomes=chromosomes)
