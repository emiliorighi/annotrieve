from helpers import parameters as parameters_helper
from typing import Optional, Dict, List

DEFAULT_FIELD_MAP: Dict[str, str] = {
    "taxids": "taxon_lineage__in",
    "db_sources": "source_file_info__database__in",
    "assembly_accessions": "assembly_accession__in",
    "md5_checksums": "annotation_id__in",
    "feature_types": "features_summary__types__in",
    "feature_sources": "features_summary__sources__in",
    "biotypes": "features_summary__biotypes__in",
    "has_metrics": "annotation_metrics__exists",
    "pipelines": "source_file_info__pipeline__name__in",
    "providers": "source_file_info__provider__in",
}

def query_params_to_mongoengine_query(
    taxids: Optional[List[str] | str] = None,
    db_sources: Optional[List[str] | str] = None,
    assembly_accessions: Optional[List[str] | str] = None,
    md5_checksums: Optional[List[str] | str] = None,
    feature_types: Optional[List[str] | str] = None,
    feature_sources: Optional[List[str] | str] = None,
    biotypes: Optional[List[str] | str] = None,
    has_metrics: Optional[bool] = None,
    pipelines: Optional[str] = None,
    providers: Optional[str] = None,
    field_map: Optional[Dict[str, str]] = None,
) -> Dict[str, object]:
    """
    Map API query parameters to a dict. Accepts str (comma-separated)
    or list inputs; normalizes, deduplicates, and skips empty filters.
    Returns:
        formatted dict
    """
    query: Dict[str, object] = {}
    mapping = {**DEFAULT_FIELD_MAP, **(field_map or {})}

    inputs = {
        "taxids": taxids,
        "db_sources": db_sources,
        "assembly_accessions": assembly_accessions,
        "md5_checksums": md5_checksums,
        "feature_types": feature_types,
        "feature_sources": feature_sources,
        "biotypes": biotypes,
        "has_metrics": has_metrics,
        "pipelines": pipelines,
        "providers": providers,
    }

    for param_name, raw_value in inputs.items():
        if param_name.lower() == 'true':
            raw_value = True
        elif param_name.lower() == 'false':
            raw_value = False
        else:
            values = parameters_helper.normalize_to_list(raw_value)
            if not values:
                continue
        field = mapping.get(param_name)
        if not field:
            # Unknown param; ignore silently or log if you prefer
            continue
        query[field] = values
    return query

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