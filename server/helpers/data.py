import csv
from io import StringIO
from bson.json_util import dumps, JSONOptions, DatetimeRepresentation
from mongoengine.queryset.visitor import Q
from werkzeug.datastructures import MultiDict
from db import models
from . import query_visitors

MODEL_MAPPER = {
    'annotations':{
        'model': models.GenomeAnnotation,
        'query': query_visitors.annotation_query,
        'tsv_fields': ['name', 'scientific_name', 'taxid', 'assembly_accession']
    },
    'assemblies':{
        'model': models.Assembly,
        'query': query_visitors.assembly_query,
        'tsv_fields': ['accession','assembly_name','scientific_name', 'taxid']
    },
    'organisms':{
        'model': models.Organism,
        'query': query_visitors.organism_query,
        'tsv_fields': ['scientific_name', 'taxid', "insdc_common_name"]
    },
    'taxons':{
        'model': models.TaxonNode,
        'query': query_visitors.taxon_query,
        'tsv_fields':  ['taxid', 'name', 'rank']
    }

}

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

def get_pagination(args):
    return int(args.pop('limit', 10)),  int(args.pop('offset', 0))

def get_sort(args):
    return args.pop('sort_column', None), args.pop('sort_order', None)

def get_items(model, immutable_dict):

    mapper = MODEL_MAPPER.get(model)

    args = MultiDict(immutable_dict)
    
    filter = args.pop('filter', None)

    q_query = mapper.get('query')(filter) if filter else None

    limit, offset = get_pagination(args)     

    sort_column, sort_order = get_sort(args)
    
    format = args.pop('format', 'json')
    
    selected_fields = args.poplist('fields[]')
    
    query, q_query = create_query(args, q_query)

    items = mapper.get('model').objects(**query)

    if q_query:
        items = items.filter(q_query)

    if sort_column and sort_order:
        sort = '-' + sort_column if sort_order == 'desc' else sort_column
        items = items.order_by(sort)

    if selected_fields:
        items = items.only(*selected_fields)

    total = items.count()

    if format == 'tsv':
        fields = selected_fields if selected_fields else mapper.get('tsv_fields')
        return create_tsv(items.as_pymongo(), fields).encode('utf-8'), "text/tab-separated-values", 200

    response = dict(total=total, data=list(items.skip(offset).limit(limit).as_pymongo()))
    return dump_json(response), "application/json", 200

def create_query(args, q_query):
    query = {}

    for key, value in args.items():
        # Skip keys with empty values
        if not value:
            continue
        
        if value == 'false':
            value = False

        if value == 'true':
            value = True

        if value == 'No Value' or ( '__exists' in key and value == False):
            value = None

        # Handle greater than/less than conditions
        if any(op in key for op in ['__gte', '__lte', '__gt', '__lt']):
            q_query = add_range_filter(key, value, q_query)

        else:
            query[key] = value

    return query, q_query

def add_range_filter(key, value, q_query):
    """Add range filtering to the query (e.g., __gte and __lte), and attempt to convert the value to a number or date."""
    # Attempt to convert value to a number (int or float)

    if validate_number(value):
        value = float(value.replace(',', '.')) if '.' in value or ',' in value else int(value)
    # Create the filter for the query
    query_visitor = {f"{key}": value}
    if q_query:
        return Q(**query_visitor) & q_query
    return Q(**query_visitor)

def validate_number(number):
    try:
        float(number)
        return True
    except ValueError:
        return False   
    

