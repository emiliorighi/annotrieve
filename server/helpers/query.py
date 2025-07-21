from mongoengine.queryset.visitor import Q
from werkzeug.datastructures import MultiDict
from . import mappers, response


def get_pagination(args):
    return int(args.pop('limit', 20)),  int(args.pop('offset', 0))

def get_sort(args):
    return args.pop('sort_column', None), args.pop('sort_order', None)

def get_items(model, immutable_dict, exclude_fields=[]):
    """
    Get items from the database with filtering, pagination, sorting, and formatting.
    
    Args:
        model: The model type to query ('annotations', 'regions', 'taxons', 'feature_types')
        immutable_dict: Dictionary of query parameters
        exclude_fields: List of fields to exclude from the results
        
    Returns:
        tuple: (response_data, mimetype, status_code)
        
    Raises:
        ValueError: If the model is not supported
    """
    # Validate model and get mapper
    mapper = mappers.get_model_mapper(model)
    
    # Parse and prepare query parameters
    args = MultiDict(immutable_dict)
    query_params = _parse_query_parameters(args)
    
    # Build the database query
    items = _build_database_query(mapper, query_params, exclude_fields)
    
    # Get total count before pagination
    total = items.count()
    
    # Format and return results
    return response.format_response(items, total, query_params, mapper)


def _parse_query_parameters(args):
    """Parse and extract all query parameters from the request arguments."""
    return {
        'filter': args.pop('filter', None),
        'limit': int(args.pop('limit', 100)),
        'offset': int(args.pop('offset', 0)),
        'sort_column': args.pop('sort_column', None),
        'sort_order': args.pop('sort_order', None),
        'format': args.pop('format', 'json'),
        'remaining_args': args
    }

def _build_database_query(mapper, query_params, exclude_fields):
    """Build the database query with filtering, sorting, and exclusions."""
    # Create base query
    q_query = mapper['query'](query_params['filter']) if query_params['filter'] else None
    query, q_query = create_query(query_params['remaining_args'], q_query)
    
    # Build the queryset
    if exclude_fields:
        items = mapper['model'].objects(**query).exclude(*exclude_fields)
    else:
        items = mapper['model'].objects(**query)
    
    # Apply additional filters
    if q_query:
        items = items.filter(q_query)
    
    # Apply sorting
    _apply_sorting(items, query_params['sort_column'], query_params['sort_order'])
    
    return items

def _apply_sorting(items, sort_column, sort_order):
    """Apply sorting to the queryset if sort parameters are provided."""
    if sort_column and sort_order:
        sort = '-' + sort_column if sort_order == 'desc' else sort_column
        items.order_by(sort)

def create_query(args, q_query):
    """
    Create a query dictionary from request arguments.
    
    Args:
        args: MultiDict of request arguments
        q_query: Existing Q query object or None
        
    Returns:
        tuple: (query_dict, q_query) where query_dict is the base query and q_query is the enhanced Q query
    """
    query = {}

    for key, value in args.items():
        # Skip keys with empty values
        if not value and value != 0:  # Allow 0 as a valid value
            continue
        
        # Convert value to appropriate type
        processed_value = _process_value(key, value)
        
        # Skip None values (they indicate "no value" or non-existent fields)
        if processed_value is None:
            continue

        # Handle range operators (greater than, less than, etc.)
        if any(op in key for op in mappers.RANGE_OPERATORS):
            q_query = add_range_filter(key, processed_value, q_query)
        else:
            query[key] = processed_value

    return query, q_query

def _process_value(key, value):
    """
    Process a single value, converting it to the appropriate type.
    
    Args:
        key: The parameter key (used for special handling)
        value: The raw value from the request
        
    Returns:
        The processed value with appropriate type, or None if the value should be excluded
    """
    # Handle string values
    if isinstance(value, str):
        value_lower = value.lower().strip()
        
        # Handle boolean conversions
        if value_lower in mappers.BOOLEAN_VALUES:
            return mappers.BOOLEAN_VALUES[value_lower]
        
        # Handle "no value" case
        if value_lower == mappers.NO_VALUE_STRING:
            return None
        
        # Return the original string if no special handling needed
        return value
    
    # Handle boolean values directly
    elif isinstance(value, bool):
        return value
    
    # Handle numeric values
    elif isinstance(value, (int, float)):
        return value
    
    # Handle None values
    elif value is None:
        return None
    
    # For other types, convert to string and process
    else:
        try:
            return _process_value(key, str(value))
        except (ValueError, AttributeError):
            # If conversion fails, skip this value
            return None

def generate_jsonlines(pymongo_data):
    for item in pymongo_data:
        yield response.dump_json(item) + "\n"


def add_range_filter(key, value, q_query):
    """
    Add range filtering to the query (e.g., __gte and __lte).
    
    Args:
        key: The field key with range operator (e.g., 'age__gte')
        value: The value to filter by
        q_query: Existing Q query object or None
        
    Returns:
        Q: Enhanced Q query object with range filter
    """
    # Convert value to appropriate numeric type if it's a string
    if isinstance(value, str):
        if validate_number(value):
            # Handle comma as decimal separator
            value = float(value.replace(',', '.')) if '.' in value or ',' in value else int(value)
        else:
            # If it's not a valid number, treat as string
            pass
    
    # Create the filter for the query
    query_visitor = {key: value}
    
    if q_query:
        return Q(**query_visitor) & q_query
    return Q(**query_visitor)

def validate_number(number):
    """
    Validate if a string can be converted to a number.
    
    Args:
        number: String to validate
        
    Returns:
        bool: True if the string can be converted to a number
    """
    if not isinstance(number, str):
        return False
    
    try:
        # Handle comma as decimal separator
        normalized = number.replace(',', '.')
        float(normalized)
        return True
    except (ValueError, AttributeError):
        return False   
    

