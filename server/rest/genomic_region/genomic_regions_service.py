from db.models import GenomicRegion
from helpers import data as data_helper
from werkzeug.exceptions import NotFound

def get_genomic_regions(args):
    query = {**args}
    return data_helper.get_items('regions', query)

def get_genomic_region(accession):
    region = GenomicRegion.objects(insdc_accession=accession).first()
    if not region:
        raise NotFound(description=f"Genomic region {accession} not found")
    return region

def get_genomic_region_stats(accession, args):
    get_genomic_region(accession)
    query = {**args}
    query['genomic_region_accession'] = accession
    return data_helper.get_items('feature_types', query)
