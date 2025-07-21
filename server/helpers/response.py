import csv
from io import StringIO
from bson.json_util import dumps, JSONOptions, DatetimeRepresentation
from flask import Response, stream_with_context

def dump_json(response_dict):
    json_options = JSONOptions()
    json_options.datetime_representation = DatetimeRepresentation.ISO8601
    return dumps(response_dict, indent=4, sort_keys=True, json_options=json_options)

def create_tsv(items, fields):
    writer_file = StringIO()
    tsv = csv.writer(writer_file, delimiter='\t')
    tsv.writerow(fields)
    for item in items:
        new_row = []
        for k in fields:
            value = item.get(k)
            new_row.append(value)
        tsv.writerow(new_row)
    return writer_file.getvalue()

def generate_jsonlines(items):
    """Generate JSON lines from database items, streaming directly from the database."""
    for item in items:
        yield dump_json(item) + "\n"

def format_jsonl_response(items, offset, limit):
    """
    Format response as streaming JSONL.
    
    Args:
        items: MongoDB queryset
        offset: Pagination offset
        limit: Pagination limit
        
    Returns:
        tuple: (generator, mimetype, status_code)
    """
    # Apply pagination to the queryset and stream directly
    paginated_items = items.skip(offset).limit(limit).as_pymongo()
    return generate_jsonlines(paginated_items), "application/jsonl", 200

def create_streaming_response(response_data, mimetype, status_code):
    """
    Create a Flask Response that handles streaming for JSONL format.
    
    Args:
        response_data: The response data (generator for JSONL, string for others)
        mimetype: The MIME type of the response
        status_code: HTTP status code
        
    Returns:
        Flask Response object
    """
    if mimetype == "application/jsonl":
        return Response(
            stream_with_context(response_data), 
            mimetype=mimetype, 
            status=status_code,
            headers={'Cache-Control': 'no-cache'}
        )
    else:
        return Response(response_data, mimetype=mimetype, status=status_code)

def format_response(items, total, query_params, mapper):
    """Format the response based on the requested format."""
    if query_params['format'] == 'tsv':
        return format_tsv_response(items, mapper)
    else:
        return format_json_response(items, total, offset, limit)

def format_tsv_response(items, mapper):
    """Format response as TSV."""
    fields = mapper['tsv_fields']
    tsv_data = create_tsv(items.as_pymongo(), fields).encode('utf-8')
    return tsv_data, "text/tab-separated-values", 200

def format_json_response(items, total, offset, limit):
    """Format response as JSON with pagination."""
    paginated_items = list(items.skip(offset).limit(limit).as_pymongo())
    response = {
        'total': total,
        'data': paginated_items,
        'pagination': {
            'limit': limit,
            'offset': offset,
        }
    }
    return dump_json(response), "application/json", 200
