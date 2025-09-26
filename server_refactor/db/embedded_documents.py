from mongoengine import (
    StringField,
    IntField,
    DictField,
    DynamicEmbeddedDocument,
    EmbeddedDocumentField,
    FloatField,
    ListField
)

class AssemblyStats(DynamicEmbeddedDocument):
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

class PipelineInfo(DynamicEmbeddedDocument):
    name = StringField()
    version = StringField()
    method = StringField()

class SourceInfo(DynamicEmbeddedDocument):
    database = StringField(required=True)
    provider = StringField()
    release_date = StringField(required=True)
    url_path = StringField(required=True, unique=True)
    last_modified = StringField(required=True)
    md5_checksum = StringField(required=True, unique=True) # 32-hex
    pipeline_metadata = EmbeddedDocumentField(PipelineInfo)
    
class FeatureStats(DynamicEmbeddedDocument):
    feature_type = StringField()
    count = IntField()
    average_length = IntField()

class FeatureTypeStats(DynamicEmbeddedDocument):
    total_count = IntField()
    average_spliced_exon_length = FloatField()
    min_length = IntField()
    max_length = IntField()
    total_length = IntField()
    mean_length = FloatField()

class AnnotationStats(DynamicEmbeddedDocument):
    feature_sources = ListField(StringField())  # Second column of GFF
    total_features = IntField()
    unique_feature_types = ListField(StringField())  # Third column of GFF (e.g., gene, exon, CDS)
    region_count = IntField()
    exon_count = IntField()
    intron_count = IntField()
    gene_count = IntField()
    mrna_count = IntField()
    # Add other stats as needed


class FeatureLengthStats(DynamicEmbeddedDocument):
    total = IntField()
    mean = FloatField()
    median = FloatField()
    percentile_90 = IntField()
    max = IntField()
    min = IntField()


class FeatureStats(DynamicEmbeddedDocument):
    count = IntField()
    unique_ids = IntField()
    length_stats = EmbeddedDocumentField(FeatureLengthStats)
    single_exon_count = IntField()
    multi_exon_count = IntField()
    overlapping_count = IntField()
    intron_count = IntField()
    exon_count = IntField()
    biotypes = DictField(field=IntField())  # e.g., {"lncRNA": 120, "protein_coding": 300}
    attributes_missing = ListField(StringField())  # e.g., ["ID", "Parent"]


class GFFStatistics(DynamicEmbeddedDocument):
    annotation_id = StringField(required=True, unique=True)  # Link to GenomeAnnotation
    total_features = IntField()
    feature_types = ListField(StringField())  # e.g., ["gene", "mRNA", "exon", "CDS"]

    # Feature stats map by type: "gene" -> stats, "mRNA" -> stats
    features = DictField(field=EmbeddedDocumentField(FeatureStats))

    # File-level details
    num_contigs = IntField()
    total_region_length = IntField()
    region_length_stats = EmbeddedDocumentField(FeatureLengthStats)

    # Source column summary
    sources_used = DictField(field=IntField())  # e.g., {"HAVANA": 1200, "ENSEMBL": 4300}

    # Quality indicators
    invalid_features_count = IntField()
    features_missing_parents = IntField()
    missing_required_attributes = ListField(StringField())
    genome_coverage_percent = FloatField()
