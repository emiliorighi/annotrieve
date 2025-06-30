from . import db
import datetime

STATUSES = ['pending','completed','error']
DBS = ['ncbi', 'ensembl']

class GenomeAnnotation(db.DynamicDocument):
    name = db.StringField(required=True, unique=True)
    source = db.StringField(required=True, choices=DBS)
    scientific_name = db.StringField(required=True)
    taxid = db.StringField()
    assembly_accession = db.StringField(required=True)
    assembly_name = db.StringField()
    taxon_lineage = db.ListField(db.StringField())
    original_url = db.URLField(required=True)
    bgzipped_path = db.StringField()
    tabix_path = db.StringField()
    md5_checksum = db.StringField()
    created_at = db.DateTimeField(default=datetime.datetime.now())
    meta = {
        'indexes': ['scientific_name', 'taxid', 'assembly_accession', 'name', 'taxon_lineage'],
        'ordering': ['-created_at']
    }

class FeatureTypeStatsNode(db.DynamicDocument):
    annotation_name = db.StringField(required=True)
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    assembly_accession = db.StringField(required=True)
    taxon_lineage = db.ListField(db.StringField())
    region_name = db.StringField(required=True)
    region_accession = db.StringField(required=True)

    feature_type = db.StringField(required=True)
    count = db.IntField(required=True)
    average_length = db.FloatField()
    total_length = db.IntField()
    min_length = db.IntField()
    max_length = db.IntField()

    parent_type = db.StringField()  # nullable for root nodes
    child_types = db.ListField(db.StringField())  # empty if leaf node

    created_at = db.DateTimeField(default=datetime.datetime.now())

    meta = {
        'indexes': [
            {
                'fields': [
                    'annotation_name',
                    'region_name',
                    'feature_type'
                ],
                'unique': True
            },
            'annotation_name', 'taxid', 'assembly_accession',
            'region_name', 'region_accession', 'feature_type'
        ]
    }

##INSDC Genomic Region
class GenomicRegion(db.DynamicDocument):
    name = db.StringField(required=True) #chr1 or 1
    insdc_accession = db.StringField(required=True, unique=True)
    assembly_accession = db.StringField(required=True)
    length = db.IntField(required=True)
    taxon_lineage = db.ListField(db.StringField())
    scientific_name = db.StringField()
    taxid = db.StringField()
    role = db.StringField()
    gc_percentage = db.FloatField()
    gc_count = db.IntField()
    created_at = db.DateTimeField(default=datetime.datetime.now())
    meta = {
        'indexes': ['assembly_accession', 'name', 'insdc_accession']
    }

class TaxonNode(db.Document):
    children = db.ListField(db.StringField())
    name = db.StringField(required=True)
    taxid = db.StringField(required= True,unique=True)
    rank = db.StringField()

    meta = {
        'indexes': [
            'taxid', 'name','children'
        ]
    }