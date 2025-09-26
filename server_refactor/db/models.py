from datetime import datetime, timedelta
from .embedded_documents import AssemblyStats, SourceInfo
from helpers import query_visitors as query_visitors_helper
from mongoengine import (
    Document,
    DynamicDocument,
    StringField,
    DateField,
    ListField,
    IntField,
    EmbeddedDocumentField,
    FloatField,
    URLField,
    BooleanField,
    DateTimeField,
    DictField,
)

class GenomeAssembly(DynamicDocument):
    assembly_accession = StringField(required=True, unique=True)
    paired_assembly_accession = StringField() #if the assembly is a pair, the accession of the paired assembly
    assembly_name = StringField(required=True)
    source_database = StringField() #GenBank (INSDC), RefSeq
    taxid = StringField(required=True)
    organism_name = StringField(required=True)
    taxon_lineage = ListField(StringField())
    assembly_stats = EmbeddedDocumentField(AssemblyStats)
    annotations_count = IntField()
    download_url = URLField()
    meta = {
        'indexes': [
            "assembly_accession", 
            "assembly_name",
            "source_database",
            "taxid",
            "organism_name",
            "taxon_lineage"
        ],
    }

class Organism(DynamicDocument):
    taxid = StringField(required=True, unique=True)
    organism_name = StringField(required=True)
    taxon_lineage = ListField(StringField())
    annotations_count = IntField()
    assemblies_count = IntField()
    meta = {
        'indexes': ['taxid', 'organism_name', 'taxon_lineage']
    }

#class to map aliases to the related sequence_id in the gff file
class AnnotationSequenceMap(DynamicDocument):
    sequence_id = StringField(required=True) #id in the gff file
    md5_checksum = StringField(required=True)
    aliases = ListField(StringField()) #aliases for the sequence_id, e.g. chr1, 1, 1_1, 1_1_1,ucsc_style_name, refseq_accession, insdc_accession, etc.
    meta = {
        'indexes': ['md5_checksum', 'sequence_id', 'aliases']
    }

class GenomicSequence(DynamicDocument):
    assembly_accession = StringField(required=True)
    ucsc_style_name = StringField()
    genbank_accession = StringField()
    refseq_accession = StringField()
    sequence_role = StringField()
    assembly_unit = StringField()
    chr_name = StringField()
    assigned_molecule = StringField()
    length = IntField()
    gc_count = IntField()
    gc_percent = FloatField()
    assigned_molecule_location_type = StringField()
    role = StringField()
    sequence_name = StringField()
    meta = {
        'indexes': ['assembly_accession', 'genbank_accession', 'refseq_accession','ucsc_style_name', 'chr_name']
    }

class AnnotationError(DynamicDocument):
    """
    This document is used to store errors that occur when processing the annotation files.
    It is used to track the errors and to help with debugging.
    """
    assembly_accession = StringField(required=True)
    taxid = StringField(required=True)
    organism_name = StringField(required=True)
    error_message = StringField()
    url_path = StringField(required=True, unique=True)
    source_md5 = StringField(required=True, unique=True) # 32-hex
    release_date = DateField(required=True)
    last_modified = DateField(required=True)
    source_database = StringField(required=True)
    created_at = StringField(default=datetime.now().isoformat().split('T')[0])
    meta = {
        'indexes': ['assembly_accession', 'taxid', 'organism_name', 'uri_path', 'source_md5', 'source_database'],
        'ordering': ['-created_at']
    }

class GenomeAnnotation(DynamicDocument):
    # Context
    assembly_accession = StringField(required=True)
    assembly_name = StringField(required=True)
    organism_name = StringField(required=True)
    taxid = StringField(required=True)
    taxon_lineage = ListField(StringField(), required=True)
    
    # File format
    format = StringField(required=True)
    file_size_mb = FloatField(required=True)

    # Provenance
    source_info = EmbeddedDocumentField(SourceInfo)

    bgzipped_path = StringField(required=True, unique=True)
    md5_checksum = StringField(required=True, unique=True)

    feature_sources = ListField(StringField()) # Second column of GFF
    feature_types = ListField(StringField()) # Third column of GFF

    # Time
    processed_at = StringField(default=datetime.now().isoformat().split('T')[0])
    meta = {
        "indexes": [
            "organism_name",
            "taxid",
            "assembly_accession",
            "assembly_name",
            "md5_checksum",
            "bgzipped_path",
            "source_info.database",
            "source_info.md5_checksum",
            "feature_sources",
            "feature_types",
        ],
        "ordering": ["-processed_at"],
    }

class TaxonNode(Document):
    children = ListField(StringField())
    scientific_name = StringField(required=True)
    taxid = StringField(required= True,unique=True)
    rank = StringField()
    assemblies_count = IntField()
    annotations_count = IntField()
    organisms_count = IntField() #how many leaves are down from this node
    created_at = StringField(default=datetime.now().isoformat().split('T')[0])
    updated_at = StringField(default=datetime.now().isoformat().split('T')[0])
    meta = {
        'indexes': [
            'taxid', 'scientific_name','children','rank'
        ]
    }

class Dataset(DynamicDocument):
    dataset_id = StringField(required=True, unique=True)
    status = StringField(required=True, default='pending')
    error_message = StringField()
    download_url = URLField()
    number_of_files = IntField(required=True)
    file_name = StringField(required=True)
    file_format = StringField(required=True)
    total_file_size = IntField()
    include_indexes = BooleanField(default=False)
    include_metadata = BooleanField(default=False)
    meta = {
        'indexes': ['dataset_id']
    }

class GenomeAnnotationQuery(DynamicDocument):
    query_id = StringField(required=True, unique=True) #the hexadigest sha256 of the query dict
    query_dict = DictField()
    annotations_count = IntField() #how many annotations this query has returned
    usage_count = IntField(default=1) #how many times this query has been used, it starts at 1 because the query is created when the user makes a request
    created_at = DateTimeField(default=datetime.now())
    expires_at = DateTimeField(default=lambda: datetime.now() + timedelta(hours=12))
    meta = {
        "indexes": [
            "query_id",
            {"fields": ["expires_at"], "expireAfterSeconds": 0}  # TTL index
        ]
    }
    def to_mongoengine_filter_and_query(self):
        q = {}
        q_filter = None
        if self.query_dict.get("taxon_lineages"):
            q["taxon_lineage__in"] = self.query_dict["taxon_lineages"]
        if self.query_dict.get("db_sources"):
            q["source_info__database__in"] = self.query_dict["db_sources"]
        if self.query_dict.get("assembly_accessions"):
            q["assembly_accession__in"] = self.query_dict["assembly_accessions"]
        if self.query_dict.get("md5_checksums"):
            q["md5_checksum__in"] = self.query_dict["md5_checksums"]
        if self.query_dict.get("filter"):
            q_filter =  query_visitors_helper.annotation_query(self.query_dict["filter"]) if self.query_dict["filter"] else None
        return q, q_filter

