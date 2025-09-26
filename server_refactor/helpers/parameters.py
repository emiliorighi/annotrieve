from typing import Optional, Iterable, List
from fastapi import HTTPException

def split_string_param(param:str|list):
    if isinstance(param, str):
        return param.split(',')
    return param

def format_boolean_param(param:str|bool):
    if isinstance(param, str):
        return param.lower() == 'true'
    return param

def handle_request_params(commons: dict | None, payload: dict | None):
    if payload:
        return payload
    else:
        return commons

def format_int_param(param:str|int, param_name:str):
    try:
        return int(param)
    except ValueError:
        raise ValueError(f"Invalid integer parameter: {param_name}")

def handle_pagination_params(offset:int, limit:int, count:int):
    """
    Handles the pagination parameters.
    If the limit is 0, it will return the count.
    If the limit is greater than the count, it will return the count.
    If the offset is less than 0, it will return 0. 
    If the limit is less than 0, it will return 0. 
    If the offset is greater than the count, it will return 0.
    """
    offset = format_int_param(offset, 'offset')
    limit = format_int_param(limit, 'limit')
    if limit > count or limit <= 0:
        limit = count
    if offset < 0 or offset > count:
        offset = 0
    return offset, limit

def normalize_to_list(value: Optional[Iterable[str] | str]) -> List[str]:
    if value is None:
        return []
    if isinstance(value, str):
        parts = split_string_param(value)  # comma-split if string
    else:
        parts = list(value)
    # trim, drop empties, dedupe (preserve order)
    seen = set()
    result = []
    for v in parts:
        if v is None:
            continue
        s = str(v).strip()
        if not s or s in seen:
            continue
        seen.add(s)
        result.append(s)
    return result

def coerce_optional_int(value, name: str):
    if value is None or isinstance(value, int):
        return value
    try:
        return int(value)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid numeric parameter '{name}': {value}")
