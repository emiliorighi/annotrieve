from helpers import parameters as parameters_helper
from typing import Optional, Dict, List, Any
from db.embedded_documents import GeneStats, GeneLengthStats, TranscriptStats, LengthStats, FeatureStats, TranscriptTypeStats, FeatureTypeStats, GFFStats
import statistics
from fastapi import HTTPException
from db.models import AnnotationSequenceMap
from helpers import pysam_helper


DEFAULT_FIELD_MAP: Dict[str, str] = {
    "taxids": "taxon_lineage__in",
    "db_sources": "source_file_info__database__in",
    "assembly_accessions": "assembly_accession__in",
    "md5_checksums": "annotation_id__in",
    "feature_types": "features_summary__types__in",
    "feature_sources": "features_summary__sources__in",
    "biotypes": "features_summary__biotypes__in",
    "has_stats": "features_statistics__exists",
    "pipelines": "source_file_info__pipeline__name__in",
    "providers": "source_file_info__provider__in",
    "release_date_from": "source_file_info__release_date__gte",
    "release_date_to": "source_file_info__release_date__lte",
}

# Utility to flatten nested dictionaries
def flatten_dict(d: Dict[str, Any], parent_key: str = '', sep: str = '.') -> Dict[str, Any]:
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def resolve_sequence_id(region:str| int, md5_checksum:str, file_path:str):
    """
    Resolve the sequence id from the region or aliases
    """
    region_str = str(region)
    seq_id = None
    #resolve aliases to sequence_id
    gff_region = AnnotationSequenceMap.objects(annotation_id=md5_checksum, aliases__in=[region, region_str]).first()
    if not gff_region:
        print(f"Region '{region}' not found in annotation {md5_checksum}")
        #check if the region is present in the contigs
        for contig in pysam_helper.stream_contigs_names(file_path):
            if region == contig:
                seq_id = region
                break
        if not seq_id:
            raise HTTPException(status_code=404, detail=f"Region '{region}' not found in annotation {md5_checksum}")
    else:
        seq_id = gff_region.sequence_id
    return seq_id

def map_to_gff_stats(features_stats: Dict[str, Any]) -> GFFStats:
    """
    Map the feature stats to the FeatureStats embedded document
    """
    return GFFStats(
        **{
            key: map_to_gene_stats(value) 
            for key, value in features_stats.items() if value
            }
        )

def map_to_gene_stats(gene_stats: Dict[str, Any]) -> GeneStats:
    """
    Map the gene stats to the GeneStats embedded document
    """
    return GeneStats(
        count=gene_stats.get('count'),
        length_stats=GeneLengthStats(**gene_stats.get('length_stats')),
        transcripts=TranscriptStats(
            count=gene_stats.get('transcripts').get('count'),
            per_gene=gene_stats.get('transcripts').get('per_gene'),
            types={
                transcript_type: TranscriptTypeStats(
                    count=transcript_type_stats.get('count'),
                    per_gene=transcript_type_stats.get('per_gene'),
                    exons_per_transcript=transcript_type_stats.get('exons_per_transcript'),
                    length_stats=LengthStats(**transcript_type_stats.get('length_stats')),
                    spliced_length_stats=LengthStats(**transcript_type_stats.get('spliced_length_stats')) if transcript_type_stats.get('spliced_length_stats') else None,
                    exon_length_stats=LengthStats(**transcript_type_stats.get('exon_length_stats')) if transcript_type_stats.get('exon_length_stats') else None,
                )
                for transcript_type, transcript_type_stats in gene_stats.get('transcripts').get('types').items()
            }
        ),
        features=FeatureStats(
            exons=FeatureTypeStats(
                count=gene_stats.get('features', {}).get('exons', {}).get('count'),
                length_stats=LengthStats(**gene_stats.get('features', {}).get('exons', {}).get('length_stats')),
            ),
            cds=FeatureTypeStats(
                count=gene_stats.get('features', {}).get('cds', {}).get('count'),
                length_stats=LengthStats(**gene_stats.get('features', {}).get('cds', {}).get('length_stats')),
            ) if gene_stats.get('features').get('cds') else None,
            introns=FeatureTypeStats(
                count=gene_stats.get('features', {}).get('introns', {}).get('count'),
                length_stats=LengthStats(**gene_stats.get('features', {}).get('introns', {}).get('length_stats')),
            ),
        ),
    )

def query_params_to_mongoengine_query(
    taxids: Optional[List[str] | str] = None,
    db_sources: Optional[List[str] | str] = None,
    assembly_accessions: Optional[List[str] | str] = None,
    md5_checksums: Optional[List[str] | str] = None,
    feature_types: Optional[List[str] | str] = None,
    feature_sources: Optional[List[str] | str] = None,
    biotypes: Optional[List[str] | str] = None,
    has_stats: Optional[bool] = None,
    pipelines: Optional[List[str] | str] = None,
    providers: Optional[List[str] | str] = None,
    release_date_from: Optional[str] = None,
    release_date_to: Optional[str] = None,
    field_map: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Convert API query parameters to MongoDB query format.
    
    Args:
        taxids: Taxonomic IDs (organism identifiers)
        db_sources: Database sources to filter by
        assembly_accessions: Assembly accession numbers
        md5_checksums: MD5 checksums of annotation files
        feature_types: Types of genomic features
        feature_sources: Sources of features
        biotypes: Biological types of features
        has_stats: Whether annotations have computed statistics
        pipelines: Annotation pipelines used
        providers: Data providers
        release_date_from: Filter annotations from this date (ISO format)
        release_date_to: Filter annotations to this date (ISO format)
        field_map: Custom field mapping overrides
    
    Returns:
        Dict containing MongoDB query conditions
        
    Raises:
        ValueError: If invalid parameter values are provided
    """
    query: Dict[str, Any] = {}
    mapping = {**DEFAULT_FIELD_MAP, **(field_map or {})}

    # Define parameter configurations with their processing rules
    param_configs = {
        "taxids": {"type": "list", "normalize": True, "required": False},
        "db_sources": {"type": "list", "normalize": True, "required": False},
        "assembly_accessions": {"type": "list", "normalize": True, "required": False},
        "md5_checksums": {"type": "list", "normalize": True, "required": False},
        "feature_types": {"type": "list", "normalize": True, "required": False},
        "feature_sources": {"type": "list", "normalize": True, "required": False},
        "biotypes": {"type": "list", "normalize": True, "required": False},
        "has_stats": {"type": "bool", "normalize": False, "required": False},
        "pipelines": {"type": "list", "normalize": True, "required": False},
        "providers": {"type": "list", "normalize": True, "required": False},
        "release_date_from": {"type": "date", "normalize": False, "required": False},
        "release_date_to": {"type": "date", "normalize": False, "required": False},
    }

    inputs = {
        "taxids": taxids,
        "db_sources": db_sources,
        "assembly_accessions": assembly_accessions,
        "md5_checksums": md5_checksums,
        "feature_types": feature_types,
        "feature_sources": feature_sources,
        "biotypes": biotypes,
        "has_stats": has_stats,
        "pipelines": pipelines,
        "providers": providers,
        "release_date_from": release_date_from,
        "release_date_to": release_date_to,
    }

    for param_name, raw_value in inputs.items():
        # Skip if no value provided
        if raw_value is None:
            continue
            
        config = param_configs.get(param_name, {"type": "list", "normalize": True, "required": False})
        field = mapping.get(param_name)
        
        if not field:
            continue
            
        try:
            processed_value = _process_parameter_value(raw_value, config)
            if processed_value is not None:
                query[field] = processed_value
        except (ValueError, TypeError) as e:
            raise ValueError(f"Invalid value for parameter '{param_name}': {raw_value}. {str(e)}")

    return query


def _process_parameter_value(raw_value: Any, config: Dict[str, Any]) -> Any:
    """
    Process a single parameter value according to its configuration.
    
    Args:
        raw_value: The raw parameter value
        config: Configuration dict with type and normalization rules
        
    Returns:
        Processed value ready for MongoDB query
        
    Raises:
        ValueError: If value cannot be processed according to config
    """
    param_type = config.get("type", "list")
    should_normalize = config.get("normalize", True)
    
    if param_type == "bool":
        return _process_boolean_value(raw_value)
    elif param_type == "list":
        return _process_list_value(raw_value, should_normalize)
    elif param_type == "int":
        return _process_int_value(raw_value)
    elif param_type == "date":
        return _process_date_value(raw_value)
    elif param_type == "string":
        return _process_string_value(raw_value, should_normalize)
    else:
        raise ValueError(f"Unsupported parameter type: {param_type}")


def _process_boolean_value(raw_value: Any) -> bool:
    """Process boolean parameter values."""
    if isinstance(raw_value, bool):
        return raw_value
    elif isinstance(raw_value, str):
        normalized = raw_value.lower().strip()
        if normalized in ('true', '1', 'yes', 'on'):
            return True
        elif normalized in ('false', '0', 'no', 'off'):
            return False
        else:
            raise ValueError(f"Invalid boolean value: {raw_value}")
    elif isinstance(raw_value, (int, float)):
        return bool(raw_value)
    else:
        raise ValueError(f"Cannot convert to boolean: {type(raw_value).__name__}")


def _process_list_value(raw_value: Any, should_normalize: bool = True) -> List[str] | None:
    """
    Process list parameter values.
    
    Args:
        raw_value: The raw parameter value
        should_normalize: Whether to normalize the value (trim, dedupe, etc.)
        
    Returns:
        Processed list or None if empty after processing
    """
    if isinstance(raw_value, list):
        values = raw_value
    elif isinstance(raw_value, str):
        if should_normalize:
            values = parameters_helper.normalize_to_list(raw_value)
        else:
            # Simple split without normalization
            values = [v.strip() for v in raw_value.split(',') if v.strip()]
    else:
        # Convert single value to list
        values = [str(raw_value)] if raw_value is not None else []
    
    # Return None for empty lists to avoid adding empty filters
    return values if values else None


def _process_int_value(raw_value: Any) -> int:
    """Process integer parameter values."""
    if isinstance(raw_value, int):
        return raw_value
    elif isinstance(raw_value, str):
        try:
            return int(raw_value.strip())
        except ValueError:
            raise ValueError(f"Invalid integer value: {raw_value}")
    elif isinstance(raw_value, float):
        return int(raw_value)
    else:
        raise ValueError(f"Cannot convert to integer: {type(raw_value).__name__}")


def _process_date_value(raw_value: Any) -> str:
    """Process date parameter values."""
    if isinstance(raw_value, str):
        date_str = raw_value.strip()
        # Basic validation - could be enhanced with proper date parsing
        if not date_str:
            raise ValueError("Empty date string")
        return date_str
    else:
        raise ValueError(f"Date must be a string, got: {type(raw_value).__name__}")


def _process_string_value(raw_value: Any, should_normalize: bool = True) -> str:
    """Process string parameter values."""
    if isinstance(raw_value, str):
        if should_normalize:
            return raw_value.strip()
        else:
            return raw_value
    else:
        # Convert to string
        return str(raw_value).strip() if should_normalize else str(raw_value)

def get_latest_release_by_group_pipeline(group_by: str):
    group_field_map = {
        "organism": "taxid",
        "assembly": "assembly_accession",
    }
    field = group_field_map.get(group_by, group_by)  # allow direct field

    return [
        {"$sort": {
            field: 1,
            "source_file_info.release_date": -1,
            "source_file_info.last_modified": -1,
            "_id": -1,
        }},
        {"$group": {"_id": f"${field}", "latest_annotation": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$latest_annotation"}},
    ]


def map_to_gene_category_stats(data: Dict[str, Any], counts: List[int], mean_lengths: List[float]) -> dict[str, Any]:
    return {
        'total_count': data.get('total_count', 0),
        'mean_count': round(data.get('avg_count', 0), 2) if data.get('avg_count') else 0,
        'median_count': round(statistics.median(counts), 2) if counts else 0,
        'mean_length': round(data.get('avg_mean_length', 0), 2) if data.get('avg_mean_length') else 0,
        'median_length': round(statistics.median(mean_lengths), 2) if mean_lengths else 0,
        'transcript_types': data.get('transcript_types_array', [])
    }

def map_to_transcript_type_stats(data: Dict[str, Any], counts: List[int], mean_lengths: List[float]) -> dict[str, Any]:
    return {
        'total_count': data.get('total_count', 0),
        'mean_count': round(data.get('avg_count', 0), 2) if data.get('avg_count') else 0,
        'median_count': round(statistics.median(counts), 2) if counts else 0,
        'mean_length': round(data.get('avg_mean_length', 0), 2) if data.get('avg_mean_length') else 0,
        'median_length': round(statistics.median(mean_lengths), 2) if mean_lengths else 0,
    }

def category_stats_to_dict(dict_data: dict[str, Any]) -> dict[str, Any]:
    return {
        'total_count': dict_data.get('total_count'),
        'mean_count': dict_data.get('mean_count'),
        'median_count': dict_data.get('median_count'),
        'mean_length': dict_data.get('mean_length'),
        'median_length': dict_data.get('median_length'),
    }