from . import db
import datetime

STATUSES = ['pending','processing','completed','error']
DBS = ['ncbi', 'ensembl']

class GenomeAnnotation(db.DynamicDocument):
    name = db.StringField(required=True,unique=True)
    taxid = db.StringField(required=True)
    assembly_accession = db.StringField(required=True)
    assembly_name=db.StringField(required=True)
    scientific_name = db.StringField()
    taxon_lineage = db.ListField(db.StringField())
    processing_status = db.StringField(choices=STATUSES, default='pending')
    source_db = db.StringField(required=True, choices=DBS)
    source_link = db.URLField(required=True)
    bgzip_path = db.StringField()
    tabix_path = db.StringField()
    meta = {
        'indexes': ['name','taxid','scientific_name','assembly_accession','taxon_lineage']
    }

class Assembly(db.DynamicDocument):
    accession = db.StringField(unique=True, required=True)
    taxon_lineage = db.ListField(db.StringField())
    assembly_name=db.StringField()
    scientific_name= db.StringField(required=True)
    taxid = db.StringField(required=True)
    created = db.DateTimeField(default=datetime.datetime.now())
    chromosomes=db.ListField(db.StringField())
    meta = {
        'indexes': ['accession','taxid', 'assembly_name','taxon_lineage']
    }

class Chromosome(db.DynamicDocument):
    accession_version = db.StringField(required=True,unique=True)
    assembly_accession = db.StringField()
    chr_name=db.StringField(required=True)
    length=db.IntField(required=True)
    meta = {
        'indexes': ['accession_version','chr_name']
    }

class TaxonNode(db.Document):
    children = db.ListField(db.StringField())
    name = db.StringField(required=True)
    taxid = db.StringField(required= True,unique=True)
    rank = db.StringField()
    leaves = db.IntField()
    meta = {
        'indexes': [
            'taxid', 'name','children'
        ]
    }

class Organism(db.DynamicDocument):
    insdc_common_name = db.StringField()
    scientific_name = db.StringField(required=True,unique=True)
    taxid = db.StringField(required= True,unique=True)
    taxon_lineage = db.ListField(db.StringField())
    meta = {
        'indexes': [
            'scientific_name',
            'insdc_common_name',
            'taxid',
            'taxon_lineage'
        ],
        'strict': False
    }