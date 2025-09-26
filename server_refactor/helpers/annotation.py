from helpers import parameters as parameters_helper
from typing import Optional, Dict, List

DEFAULT_FIELD_MAP: Dict[str, str] = {
    "taxids": "taxon_lineage",
    "db_sources": "source_info__database",
    "assembly_accessions": "assembly_accession",
    "md5_checksums": "md5_checksum",
    # add as needed (override via field_map):
    "feature_types": "feature_type",
    "feature_sources": "source",
}

def query_params_to_mongoengine_query(
    taxids: Optional[List[str] | str] = None,
    db_sources: Optional[List[str] | str] = None,
    assembly_accessions: Optional[List[str] | str] = None,
    md5_checksums: Optional[List[str] | str] = None,
    feature_types: Optional[List[str] | str] = None,
    feature_sources: Optional[List[str] | str] = None,
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
    }

    for param_name, raw_value in inputs.items():
        values = parameters_helper.normalize_to_list(raw_value)
        if not values:
            continue
        field = mapping.get(param_name)
        if not field:
            # Unknown param; ignore silently or log if you prefer
            continue
        query[f"{field}__in"] = values

    return query

def get_latest_release_by_group_pipeline(group_by: str):
    return [
        {
            "$sort": {group_by: 1, "source_info.release_date": -1}
        },
        {
            "$group": {
                "_id": group_by,
                "latest_annotation": {"$first": "$$ROOT"}
            }
        },
        {
            "$replaceRoot": {"newRoot": "$latest_annotation"}
        }
    ]