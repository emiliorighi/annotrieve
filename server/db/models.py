from . import db
import datetime

class AnnotationError(db.Document):
    annotation_name = db.StringField(required=True)
    assembly_accession = db.StringField(required=True)
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    error_message = db.StringField()
    created_at = db.DateTimeField(default=datetime.datetime.now())
    meta = {
        'indexes': ['annotation_name']
    }

class GenomeAssembly(db.DynamicDocument):
    name = db.StringField(required=True)
    assembly_accession = db.StringField(required=True, unique=True)
    assembly_name = db.StringField(required=True)
    taxid = db.StringField(required=True)
    scientific_name = db.StringField(required=True)
    taxon_lineage = db.ListField(db.StringField())
    annotations_count = db.IntField()
    chromosomes_count = db.IntField()
    created_at = db.DateTimeField(default=datetime.datetime.now())
    meta = {
        'indexes': ['assembly_accession', 'assembly_name', 'taxid', 'scientific_name', 'taxon_lineage']
    }

class GenomeAnnotation(db.DynamicDocument):
    name = db.StringField(required=True, unique=True)
    source = db.StringField(required=True)
    gff_version = db.StringField()
    scientific_name = db.StringField(required=True)
    taxid = db.StringField()
    assembly_accession = db.StringField(required=True)
    assembly_name = db.StringField()
    taxon_lineage = db.ListField(db.StringField())
    original_url = db.URLField(required=True)
    bgzipped_path = db.StringField()
    tabix_path = db.StringField()
    md5_checksum = db.StringField()
    inconsistent_features = db.IntField()
    inconsistent_features_path = db.StringField()
    skipped_regions_path = db.StringField()
    created_at = db.DateTimeField(default=datetime.datetime.now())
    meta = {
        'indexes': ['scientific_name', 'taxid', 'assembly_accession', 'name', 'taxon_lineage'],
        'ordering': ['-created_at']
    }

class Chromosome(db.DynamicDocument):
    chr_name = db.StringField(required=True) #chr1 or 1
    insdc_accession = db.StringField(required=True, unique=True)
    assembly_accession = db.StringField(required=True)
    length = db.IntField(required=True)
    gc_percentage = db.FloatField()
    gc_count = db.IntField()
    sequence_name = db.StringField()
    created_at = db.DateTimeField(default=datetime.datetime.now())
    meta = {
        'indexes': ['assembly_accession', 'chr_name', 'insdc_accession'],
        'ordering': ['chr_name'] #order by chr_name
    }

class InconsistentFeature(db.DynamicDocument):
    annotation_name = db.StringField(required=True)
    seqid = db.StringField()
    source = db.StringField()
    type = db.StringField()
    start = db.IntField()
    end = db.IntField()
    strand = db.StringField()
    phase = db.StringField()
    attributes = db.DictField()
    score = db.FloatField()
    created_at = db.DateTimeField(default=datetime.datetime.now())

class RegionFeatureTypeStats(db.DynamicDocument):
    annotation_name = db.StringField(required=True)
    region_name = db.StringField(required=True)
    region_accession = db.StringField(required=True)

    feature_type = db.StringField(required=True)
    count = db.IntField(required=True)
    mean_length = db.FloatField()
    total_length = db.IntField()
    min_length = db.IntField()
    max_length = db.IntField()

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
            'annotation_name', 'assembly_accession',
            'region_name', 'region_accession', 'feature_type'
        ]
    }

class ParentFeatureTypeStats(db.DynamicDocument):
    """
    Stores parent-specific statistics for a feature type.
    """
    annotation_name = db.StringField(required=True)
    region_name = db.StringField(required=True)
    region_accession = db.StringField(required=True)

    feature_type = db.StringField(required=True)                # e.g., "exon"
    parent_type = db.StringField(default='__root__')                 # e.g., "mRNA", "tRNA"

    feature_count_under_parent_type = db.IntField(required=True)  # Total number of this feature_type with this parent_type
    mean_count = db.FloatField()                        # Avg number of children per parent
    mean_length = db.FloatField()
    total_length = db.IntField()         # Avg total length of feature_type per parent
    mean_spliced_exon_length = db.IntField()                       # Sum of exons per parent (only for parents with exons as children)

    created_at = db.DateTimeField(default=datetime.datetime.now)

    meta = {
        'indexes': [
            {'fields': ['annotation_name', 'region_name', 'feature_type', 'parent_type'], 'unique': True},
            'annotation_name', 'region_name', 'feature_type', 'parent_type'
        ]
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
    mean_length = db.FloatField()
    total_length = db.IntField()
    min_length = db.IntField()
    max_length = db.IntField()

    parent_type = db.StringField()  # nullable for root nodes
    child_types = db.ListField(db.StringField())  # empty if leaf node

    mean_total_feature_length_per_parent = db.FloatField()  # e.g., mean feature length per parent (example: mean CDS length per mRNA)
    mean_child_to_parent_length_ratio = db.FloatField()     # e.g., mean total exon length / mRNA length (example: mean total exon length / mRNA length)
    mean_spliced_exon_length = db.IntField()                # mean spliced length (sum of exons) per parent (example: mean spliced exon length per mRNA)

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
    sequence_name = db.StringField()
    assigned_molecule_location_type = db.StringField()
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

