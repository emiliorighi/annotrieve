from datetime import datetime
from .embedded_documents import AssemblyStats, SourceFileInfo, IndexedFileInfo, FeatureOverview, GFFStats, GeneStats
from mongoengine import (
    Document,
    DynamicDocument,
    StringField,
    ListField,
    IntField,
    EmbeddedDocumentField,
    URLField,
    DateTimeField,
)

def drop_all_collections():
    GenomeAssembly.objects().delete()
    Organism.objects().delete()
    AnnotationSequenceMap.objects().delete()
    GenomicSequence.objects().delete()
    AnnotationError.objects().delete()
    GenomeAnnotation.objects().delete()
    TaxonNode.objects().delete()

class GenomeAssembly(DynamicDocument):
    assembly_accession = StringField(required=True, unique=True)
    paired_assembly_accession = StringField() #if the assembly is a pair, the accession of the paired assembly
    assembly_name = StringField(required=True)
    source_database = StringField() #GenBank (INSDC), RefSeq
    assembly_level = StringField() #chromosome, contig, scaffold, complete genome, etc.
    assembly_status = StringField() #current, suppressed.
    assembly_type = StringField() #haploid etc.
    refseq_category = StringField() #reference genome, etc.
    taxid = StringField(required=True)
    organism_name = StringField(required=True)
    taxon_lineage = ListField(StringField())
    assembly_stats = EmbeddedDocumentField(AssemblyStats)
    release_date = DateTimeField()
    submitter = StringField()
    annotations_count = IntField()
    download_url = URLField(required=True, unique=True)
    meta = {
        'indexes': [
            "assembly_accession", 
            "source_database",
            "taxid",
            "organism_name",
            "taxon_lineage"
        ],
    }

class Organism(DynamicDocument):
    taxid = StringField(required=True, unique=True)
    organism_name = StringField(required=True)
    common_name = StringField()
    taxon_lineage = ListField(StringField())
    annotations_count = IntField()
    assemblies_count = IntField()
    meta = {
        'indexes': [
            'taxid', 
            'organism_name', 
            'taxon_lineage', 
            'common_name'
            ]
    }

#class to map aliases to the related sequence_id in the gff file
class AnnotationSequenceMap(DynamicDocument):
    sequence_id = StringField(required=True) #id in the gff file
    annotation_id = StringField(required=True) #indexed_file_info.uncompressed_md5 of the annotation
    aliases = ListField(StringField()) #aliases for the sequence_id, e.g. chr1, 1, 1_1, 1_1_1,ucsc_style_name, refseq_accession, insdc_accession, etc.
    meta = {
        'indexes': ['annotation_id', 'sequence_id', 'aliases']
    }

class GenomicSequence(DynamicDocument):
    #ASSEMBLY
    assembly_accession = StringField(required=True)
    assembly_name = StringField(required=True)

    #SEQUENCE IDENTIFIERS
    ucsc_style_name = StringField()
    genbank_accession = StringField()
    refseq_accession = StringField()
    
    chr_name = StringField()
    sequence_name = StringField() #assigned_molecule in the assembly report
    length = IntField()

    aliases = ListField(StringField(), required=True) #all possible aliases for the chromosome
    meta = {
        'indexes': ['assembly_accession', 'aliases']
    }

class AnnotationError(DynamicDocument):
    """
    This document is used to store errors that occur when processing the annotation files.
    It is used to track the errors and to help with debugging.
    """
    assembly_accession = StringField(required=True)
    taxid = StringField(required=True)
    organism_name = StringField(required=True)
    error_message = StringField(required=True)
    url_path = StringField(required=True, unique=True)
    source_md5 = StringField(required=True, unique=True) # 32-hex
    release_date = DateTimeField(required=True)
    last_modified = DateTimeField(required=True)
    source_database = StringField(required=True)
    created_at = DateTimeField(default=datetime.now())
    meta = {
        'indexes': ['assembly_accession', 'taxid', 'organism_name', 'uri_path', 'source_md5', 'source_database'],
        'ordering': ['-created_at']
    }

class GenomeAnnotation(DynamicDocument):

    annotation_id = StringField(required=True, unique=True) #indexed_file_info.uncompressed_md5
    #ASSEMBLY
    assembly_accession = StringField(required=True)
    assembly_name = StringField(required=True)

    #TAXONOMY
    organism_name = StringField(required=True)
    taxid = StringField(required=True)
    taxon_lineage = ListField(StringField(), required=True)

    #MAPPED REGIONS
    mapped_regions = ListField(StringField()) #Mapped seqid of the gff file (AnnotationSequenceMap ids)

    #SOURCE
    source_file_info = EmbeddedDocumentField(SourceFileInfo)

    #INDEXED FILE
    indexed_file_info = EmbeddedDocumentField(IndexedFileInfo)

    #FEATURE OVERVIEW
    features_summary = EmbeddedDocumentField(FeatureOverview)

    features_statistics = EmbeddedDocumentField(GFFStats)

    # Time
    meta = {
        "indexes": [
            "annotation_id",
            "organism_name",
            "taxid",
            "assembly_accession",
            "assembly_name",
            "taxon_lineage",
            "source_file_info.release_date",
            "source_file_info.last_modified",
            "features_summary.sources",
            "features_summary.types",
            "features_summary.biotypes",
        ]
    }
    def parse_iso_date(iso_date: str) -> datetime:
        """
        Parse an ISO date string to a datetime object
        """
        return datetime.fromisoformat(iso_date)

    def to_iso_date(self, date: datetime) -> str:
        """
        Convert a datetime object to an ISO date string
        """
        return date.isoformat().split('T')[0]

class TaxonNode(Document):
    children = ListField(StringField())
    scientific_name = StringField(required=True)
    taxid = StringField(required= True,unique=True)
    rank = StringField()
    assemblies_count = IntField()
    annotations_count = IntField()
    organisms_count = IntField() #how many leaves are down from this node
    meta = {
        'indexes': [
            'taxid', 'scientific_name','children','rank'
        ]
    }
