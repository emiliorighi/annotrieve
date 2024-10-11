from . import db
import datetime

class GenomeAnnotation(db.DynamicDocument):
    statuses = ['pending','processing','completed','error']
    dbs = ['ncbi', 'ensembl']
    name = db.StringField(required=True,unique=True)
    taxid= db.StringField(required=True)
    assembly_accession = db.StringField(required=True)
    assembly_name=db.StringField(required=True)
    scientific_name = db.StringField()
    taxon_lineage = db.ListField(db.StringField())
    processing_status = db.StringField(choices=statuses, default='pending')
    source_db = db.StringField(required=True, choices=dbs)
    source_link = db.URLField(required=True)
    bgzipped_link = db.URLField()
    tabix_link = db.URLField()
    meta = {
        'indexes': ['name','taxid','scientific_name','assembly_accession','taxon_lineage']
    }

class Assembly(db.DynamicDocument):
    accession = db.StringField(unique=True)
    taxon_lineage = db.ListField(db.StringField())
    assembly_name=db.StringField()
    scientific_name= db.StringField(required=True)
    taxid = db.StringField(required=True)
    created = db.DateTimeField(default=datetime.datetime.now())
    chromosomes=db.ListField(db.StringField())
    chromosomes_aliases=db.BinaryField()
    has_chromosomes_aliases=db.BooleanField(default=False)
    meta = {
        'indexes': ['accession','taxid', 'assembly_name','taxon_lineage']
    }

class Chromosome(db.DynamicDocument):
    accession_version = db.StringField(required=True,unique=True)
    name=db.StringField(required=True)
    length=db.IntField(required=True)
    meta = {
        'indexes': ['accession_version','name']
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