from collections import defaultdict
from helpers import query_visitors
from db.models import GenomeAnnotation, FeatureTypeStatsNode, AnnotationError
from collections import defaultdict

def get_annotation(name):
    return GenomeAnnotation.objects(name=name).first()

def save_annotation_errors(annotation, error):
    AnnotationError(
        annotation_name=annotation.name,
        assembly_accession=annotation.assembly_accession,
        taxid=annotation.taxid,
        scientific_name=annotation.scientific_name,
        error_message=error
    ).save()

def prepare_query(payload):
    query = {}
    if payload.get('assembly_accessions'):
        query['assembly_accession__in'] = payload.get('assembly_accessions').split(',') if isinstance(payload.get('assembly_accessions'), str) else payload.get('assembly_accessions')
    if payload.get('taxids'):
        query['taxon_lineage__in'] = payload.get('taxids').split(',') if isinstance(payload.get('taxids'), str) else payload.get('taxids')
    if payload.get('sources'):
        query['source__in'] = payload.get('sources').split(',') if isinstance(payload.get('sources'), str) else payload.get('sources')
    if payload.get('names'):
        query['name__in'] = payload.get('names').split(',') if isinstance(payload.get('names'), str) else payload.get('names')
    return query

def get_annotations_from_db(payload):
    filter = payload.get('filter')
    sort_by = payload.get('sort_by')
    sort_order = payload.get('sort_order')
    query = prepare_query(payload)
    q_filter = query_visitors.annotation_query(filter) if filter else None
    annotations = GenomeAnnotation.objects(**query).exclude('id')
    if q_filter:
        annotations = annotations.filter(q_filter)  
    if sort_by and sort_order:
        sort = '-' + sort_by if sort_order == 'desc' else sort_by
        annotations = annotations.order_by(sort)        
    return annotations

def update_annotation_errors(annotation, error):
    annotation_error = AnnotationError.objects(annotation_name=annotation.name).first()
    annotation_error.error_message = error
    annotation_error.save()

def build_hierarchy(nodes):
    node_map = {node.feature_type: node for node in nodes}
    children_map = defaultdict(list)

    for node in nodes:
        if node.parent_type:
            children_map[node.parent_type].append(node)

    def build_tree(ftype):
        node = node_map[ftype]
        return {
            'feature_type': node.feature_type,
            'count': node.count,
            'total_length': node.total_length,
            'min_length': node.min_length,
            'max_length': node.max_length,
            'average_length': node.average_length,
            'children': [build_tree(child.feature_type) for child in children_map[ftype]]
        }

    # Find root nodes (no parent_type)
    roots = [n.feature_type for n in nodes if not n.parent_type]
    return [build_tree(root) for root in roots]

def build_merged_hierarchy(nodes):
    # Group nodes by (feature_type, parent_type)
    grouped = defaultdict(list)
    for node in nodes:
        key = (node.feature_type, node.parent_type)
        grouped[key].append(node)

    # Merge nodes with the same (feature_type, parent_type)
    merged_nodes = {}
    for (ftype, ptype), group in grouped.items():
        count = sum(n.count for n in group)
        total_length = sum(n.total_length for n in group)
        min_length = min(n.min_length for n in group)
        max_length = max(n.max_length for n in group)
        avg_length = round(total_length / count, 2) if count > 0 else 0

        merged_nodes[ftype] = FeatureTypeStatsNode(
            feature_type=ftype,
            parent_type=ptype,
            count=count,
            total_length=total_length,
            min_length=min_length,
            max_length=max_length,
            average_length=avg_length
        )

    # Build a hierarchy from the merged nodes
    return build_hierarchy(list(merged_nodes.values()))