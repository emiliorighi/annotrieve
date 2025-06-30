from parsers.genome_annotation import parse_gff_line
from collections import defaultdict
from db.models import GenomeAnnotation, FeatureTypeStatsNode
from collections import defaultdict
import datetime

def map_id_to_type(pysam_file, region_name):
    id_to_type = {}
    
    # Pass 1: build id → type map
    for line in pysam_file.fetch(region_name):
        feature = parse_gff_line(line)
        if not feature:
            continue
        fid = feature.get('id')
        if fid:
            id_to_type[fid] = feature.get('type')
    return id_to_type


def build_stats_and_type_relationships(pysam_file, region_name, id_to_type):
    """
    Build stats and type relationships for a given region of an annotation.
    """
    type_stats = defaultdict(lambda: {
        'count': 0,
        'total_length': 0,
        'min_length': float('inf'),
        'max_length': 0
    })

    parent_types = defaultdict(set)
    child_types = defaultdict(set)

    # Pass 2: build stats and type relationships
    for line in pysam_file.fetch(region_name):
        feature = parse_gff_line(line)
        if not feature or 'type' not in feature:
            continue

        ftype = feature['type']
        parent_id = feature.get('parent')
        length = max(0, feature['end'] - feature['start'])

        # Stats
        stats = type_stats[ftype]
        stats['count'] += 1
        stats['total_length'] += length
        stats['min_length'] = min(stats['min_length'], length)
        stats['max_length'] = max(stats['max_length'], length)

        # Relationships
        if parent_id:
            parent_type = id_to_type.get(parent_id)
            if parent_type:
                parent_types[ftype].add(parent_type)
                child_types[parent_type].add(ftype)

    return type_stats, parent_types, child_types

def insert_feature_type_stats(type_stats, parent_types, child_types, annotation, region_name, region_accession):
    # Save to Mongo
    nodes = []
    for ftype, stats in type_stats.items():
        avg_len = round(stats['total_length'] / stats['count'], 2) if stats['count'] > 0 else 0
        min_len = stats['min_length'] if stats['min_length'] != float('inf') else 0

        node = FeatureTypeStatsNode(
            annotation_name=annotation.name,
            taxid=annotation.taxid,
            scientific_name=annotation.scientific_name,
            assembly_accession=annotation.assembly_accession,
            taxon_lineage=annotation.taxon_lineage,
            region_name=region_name,
            region_accession=region_accession,
            feature_type=ftype,
            count=stats['count'],
            average_length=avg_len,
            total_length=stats['total_length'],
            min_length=min_len,
            max_length=stats['max_length'],
            parent_type=list(parent_types[ftype])[0] if parent_types[ftype] else None,
            child_types=list(child_types[ftype]),
            created_at=datetime.datetime.now()
        )
        nodes.append(node)
    FeatureTypeStatsNode.objects.insert(nodes)
    return len(nodes)

def get_annotation(name):
    return GenomeAnnotation.objects(name=name).first()

def add_completed_status(query):
    return query.update(status='completed')

def iterate_region_features(pysam_file, region_name):
    """
    Iterate over all features in the GFF file and return a generator of parsed features
    """
    for line in pysam_file.fetch(region_name):
        parsed_feature = parse_gff_line(line)
        if not parsed_feature:
            continue
        yield parsed_feature

def get_region_name(genomic_region, gff_regions):
    region_name = None
    for n in [genomic_region.name, genomic_region.insdc_accession]:
        if n in gff_regions:
            region_name = n
            break
    return region_name

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