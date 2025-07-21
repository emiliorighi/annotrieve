from db import models
from . import query_visitors


ANNOTATION_SOURCES = {
    'https://ftp.ncbi.nlm.nih.gov/': 'ncbi',
    'https://ftp.ensembl.org/pub/rapid-release/': 'ensembl-rapid-release',
}

MODELS = {
    'genome_annotation': models.GenomeAnnotation,
    'genomic_region': models.GenomicRegion,
    'taxon': models.TaxonNode,
    'feature_types': models.FeatureTypeStatsNode,
}

MODEL_MAPPERS = {
    'annotations':{
        'model': models.GenomeAnnotation,
        'query': query_visitors.annotation_query,
        'tsv_fields': [k for k in models.GenomeAnnotation._fields if k != '_id' or k != 'created_at' ]
    },
    'regions':{
        'model': models.GenomicRegion,
        'query': query_visitors.region_query,
        'tsv_fields': [k for k in models.GenomicRegion._fields if k != '_id' or k != 'created_at']
    },
    'taxons':{
        'model': models.TaxonNode,
        'query': query_visitors.taxon_query,
        'tsv_fields': [k for k in models.TaxonNode._fields if k != '_id' or k != 'created_at']
    },
    'feature_types':{
        'model': models.FeatureTypeStatsNode,
        'query': query_visitors.feature_type_stats_query,
        'tsv_fields': [k for k in models.FeatureTypeStatsNode._fields if k != '_id' or k != 'created_at']
    }
}

NO_VALUE_STRING = 'no value'
BOOLEAN_VALUES = {'true': True, 'false': False}
RANGE_OPERATORS = ['__gte', '__lte', '__gt', '__lt']

def get_model_mapper(model):
    """Get the model mapper for the specified model type."""
    if model not in MODEL_MAPPERS:
        raise ValueError(f"Invalid model: {model}")
    return MODEL_MAPPERS[model]
