from datetime import datetime
from mongoengine import (
    StringField,
    IntField,
    BooleanField,
    EmbeddedDocument,
    EmbeddedDocumentField,
    ListField,
    DateTimeField,
    URLField,
    FloatField,
    DictField,
    DynamicEmbeddedDocument
)

class AssemblyStats(EmbeddedDocument):
    
    total_number_of_chromosomes = IntField()
    total_sequence_length = StringField()
    total_ungapped_length = StringField()
    number_of_contigs = IntField()
    contig_n50 = IntField()
    contig_l50 = IntField()
    number_of_scaffolds = IntField()
    scaffold_n50 = IntField()
    scaffold_l50 = IntField()
    gaps_between_scaffolds_count = IntField()
    number_of_component_sequences = IntField()
    atgc_count = StringField()
    gc_count = StringField()
    gc_percent = IntField()
    genome_coverage = StringField()
    number_of_organelles = IntField()

class PipelineInfo(EmbeddedDocument):
    name = StringField()
    version = StringField()
    method = StringField()

class SourceFileInfo(EmbeddedDocument):
    database = StringField(required=True)
    provider = StringField()
    release_date = DateTimeField(required=True)
    url_path = URLField(required=True, unique=True)
    last_modified = DateTimeField(required=True)
    uncompressed_md5 = StringField(required=True, unique=True) # 32-hex
    pipeline = EmbeddedDocumentField(PipelineInfo)

class IndexedFileInfo(EmbeddedDocument):
    bgzipped_path = StringField(required=True, unique=True)
    csi_path = StringField(required=True, unique=True)
    uncompressed_md5 = StringField(required=True, unique=True) # 32-hex
    file_size = IntField(required=True)
    processed_at = DateTimeField(default=datetime.now())
    pipeline = EmbeddedDocumentField(PipelineInfo)

class FeatureOverview(EmbeddedDocument):

    attribute_keys = ListField(StringField()) # Keys of the attributes of the features, e.g. ID, Parent, biotype, gene_biotype, transcript_biotype, gbkey, gene_id, transcript_id, exon_id
    types = ListField(StringField()) # Third column of GFF, e.g. gene, transcript, exon, etc.
    sources = ListField(StringField()) # Second column of GFF, e.g. RefSeq, Ensembl, etc.
    biotypes = ListField(StringField()) # Ninth column of GFF if present, e.g. protein_coding, etc.
    types_missing_id = ListField(StringField()) # Types of features that are present in features without an ID, e.g. gene, transcript, exon
    root_type_counts = DictField(field=IntField()) # Count of root-level feature types (features without Parent), e.g. {"gene": 1234, "lnc_RNA": 567}
    has_biotype = BooleanField() # Whether the GFF file has a biotype attr
    has_cds = BooleanField() # Whether the GFF file has a CDS feature
    has_exon = BooleanField() # Whether the GFF file has an exon feature

class GeneLengthStats(EmbeddedDocument):
    min = IntField()
    max = IntField()
    avg = FloatField()


class TranscriptTypeStats(EmbeddedDocument):
    count = IntField()
    count_per_gene = FloatField()
    exons_per_transcript = FloatField()
    avg_length = FloatField()
    avg_spliced_length = FloatField()

class TranscriptStats(EmbeddedDocument):
    total = IntField()
    count_per_gene = FloatField()
    by_type = DictField(field=EmbeddedDocumentField(TranscriptTypeStats))

class FeatureBaseStats(EmbeddedDocument):
    total = IntField()
    avg_length = FloatField()

class GFFStats(DynamicEmbeddedDocument):
    count = IntField()
    length = EmbeddedDocumentField(GeneLengthStats)
    transcripts = EmbeddedDocumentField(TranscriptStats)
    exons = EmbeddedDocumentField(FeatureBaseStats)
    cds = EmbeddedDocumentField(FeatureBaseStats)
    introns = EmbeddedDocumentField(FeatureBaseStats)
