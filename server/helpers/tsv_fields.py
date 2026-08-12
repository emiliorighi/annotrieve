import json
from datetime import date, datetime
from typing import Any, Iterable, Iterator, Optional

from fastapi import HTTPException

from db.models import GenomeAssembly
from helpers import constants as constants_helper
from helpers import parameters as params_helper


def _validate_selected_fields(selected_fields: str | list[str] | None) -> list[str]:
    """
    Normalize selected_fields and validate against the combined set of allowed
    extended columns (GenomeAnnotation-side + GenomeAssembly-side). Returns the
    normalized, de-duplication-preserving list of requested keys (possibly empty).
    """
    requested = params_helper.normalize_to_list(selected_fields)
    if not requested:
        return []

    allowed_extended = set(constants_helper.FIELD_TSV_EXTENDED_MAP) | set(
        constants_helper.FIELD_TSV_ASSEMBLY_MAP
    )
    invalid = [key for key in requested if key not in allowed_extended]
    if invalid:
        allowed = ", ".join(sorted(allowed_extended))
        raise HTTPException(
            status_code=400,
            detail=f"Invalid selected_fields: {', '.join(invalid)}. Allowed extended fields: {allowed}",
        )

    redundant = [key for key in requested if key in constants_helper.FIELD_TSV_MAP]
    if redundant:
        raise HTTPException(
            status_code=400,
            detail=f"selected_fields must only contain extended columns. Redundant default fields: {', '.join(redundant)}",
        )

    return requested


def resolve_tsv_field_map(selected_fields: str | list[str] | None) -> dict[str, str]:
    """
    Resolve the TSV column map for export (GenomeAnnotation-side columns only).

    When selected_fields is omitted, returns the frozen production default map.
    When present, appends validated extended columns after the defaults. Keys
    belonging to FIELD_TSV_ASSEMBLY_MAP are valid tokens but are intentionally
    left out of this map — see resolve_assembly_tsv_field_map, since those
    columns resolve against a different collection (GenomeAssembly) and require
    a join rather than a direct projection.
    """
    if selected_fields is None:
        return dict(constants_helper.FIELD_TSV_MAP)

    requested = _validate_selected_fields(selected_fields)
    if not requested:
        return dict(constants_helper.FIELD_TSV_MAP)

    field_map = dict(constants_helper.FIELD_TSV_MAP)
    requested_set = set(requested)
    for key in constants_helper.FIELD_TSV_EXTENDED_MAP:
        if key in requested_set:
            field_map[key] = constants_helper.FIELD_TSV_EXTENDED_MAP[key]
    return field_map


def resolve_assembly_tsv_field_map(selected_fields: str | list[str] | None) -> dict[str, str]:
    """
    Resolve the subset of requested columns that must be joined from the parent
    GenomeAssembly model (see FIELD_TSV_ASSEMBLY_MAP). Returns an empty dict when
    selected_fields is omitted/empty, or when none of the requested keys are
    assembly-derived. Column order follows FIELD_TSV_ASSEMBLY_MAP declaration order.
    """
    if selected_fields is None:
        return {}

    requested = _validate_selected_fields(selected_fields)
    if not requested:
        return {}

    requested_set = set(requested)
    return {
        key: path
        for key, path in constants_helper.FIELD_TSV_ASSEMBLY_MAP.items()
        if key in requested_set
    }


def dig_mongo_value(doc: dict, mongo_path: str) -> Any:
    """
    Null-safe nested lookup for mongoengine-style paths (double-underscore).

    Returns None when any parent is missing, None, or not a dict — unlike
    mongoengine .scalar(), which raises AttributeError on None parents.
    """
    current: Any = doc
    for part in mongo_path.split("__"):
        if not isinstance(current, dict):
            return None
        current = current.get(part)
        if current is None:
            return None
    return current


def iter_tsv_rows(
    annotations,
    mongo_paths: Iterable[str],
    batch_size: Optional[int] = None,
) -> Iterator[tuple]:
    """
    Project annotation fields via .only().as_pymongo() and yield value tuples.

    Missing nested parents become None instead of crashing mid-stream.
    """
    paths = list(mongo_paths)
    queryset = annotations.only(*paths)
    if batch_size is not None:
        queryset = queryset.batch_size(batch_size)
    for doc in queryset.as_pymongo():
        yield tuple(dig_mongo_value(doc, path) for path in paths)


def resolve_assembly_rows(
    batch_rows: list[tuple],
    accession_index: int,
    assembly_field_map: dict[str, str],
) -> list[tuple]:
    """
    Resolve assembly-derived columns for a batch of annotation rows via a single
    batched join on assembly_accession, keeping query volume proportional to the
    number of batches (not the number of rows) and to the number of *distinct*
    assemblies referenced in the batch (typically much smaller than the batch size,
    since many annotations share the same assembly).

    Returns a list of value-tuples (same order as assembly_field_map, aligned with
    batch_rows) meant to be concatenated onto each row.
    """
    if not assembly_field_map:
        return [() for _ in batch_rows]

    assembly_paths = list(assembly_field_map.values())
    accessions = {row[accession_index] for row in batch_rows if row[accession_index]}

    assembly_by_accession: dict[str, dict] = {}
    if accessions:
        cursor = GenomeAssembly.objects(assembly_accession__in=list(accessions)).only(
            "assembly_accession", *assembly_paths
        )
        for doc in cursor.as_pymongo():
            assembly_by_accession[doc.get("assembly_accession")] = doc

    def resolve_value(key: str, path: str, doc: Optional[dict]):
        value = dig_mongo_value(doc, path) if doc else None
        if (
            key == "assembly_download_url"
            and isinstance(value, str)
            and value.startswith(constants_helper.PLACEHOLDER_DOWNLOAD_URL_PREFIX)
        ):
            return None
        return value

    return [
        tuple(
            resolve_value(key, path, assembly_by_accession.get(row[accession_index]))
            for key, path in assembly_field_map.items()
        )
        for row in batch_rows
    ]


def format_tsv_cell(value, *, extended: bool = False) -> str:
    if value is None:
        return ""

    if not extended:
        return str(value)

    if isinstance(value, bool):
        return "true" if value else "false"

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, date):
        return value.isoformat()

    if isinstance(value, list):
        return ";".join("" if item is None else str(item) for item in value)

    if isinstance(value, dict):
        return json.dumps(value, default=str, separators=(",", ":"))

    return str(value)
