from parsers.genome_annotation import parse_gff_line
from collections import defaultdict
from db.models import FeatureTypeStatsNode, ParentFeatureTypeStats
from collections import defaultdict
import datetime
from statistics import mean

def init_global_stats():
    return defaultdict(lambda: {
        'count': 0,
        'total_length': 0,
        'min_length': float('inf'),
        'max_length': 0,
    })

def init_type_stats_by_parent():
    return defaultdict(lambda: defaultdict(lambda: {
        'total_length': 0,
        'mean_length': 0,
        'lengths_by_parent': defaultdict(int),  # parent_id → total length of feature_type
        'child_count_per_parent': defaultdict(int),  # parent_id → count of child features
        'exon_lengths_by_parent': defaultdict(int)  # for spliced exon length
    }))


def map_id_to_type_and_global_stats(pysam_file, region_name):
    id_to_type = {}
    global_type_stats = init_global_stats()
    # Pass 1: build id → type map
    for line in pysam_file.fetch(region_name):
        feature = parse_gff_line(line)
        if not feature or 'type' not in feature:
            continue
        fid = feature.get('id')
        ftype = feature.get('type')
        length = max(0, feature['end'] - feature['start'])
        if fid:
            id_to_type[fid] = ftype

        global_stats = global_type_stats[ftype]
        global_stats['count'] += 1
        global_stats['total_length'] += length
        global_stats['min_length'] = min(global_stats['min_length'], length)
        global_stats['max_length'] = max(global_stats['max_length'], length)
    #here we create a list ready for bulk insert
    global_stats_list = []
    for _, stats in global_type_stats.items():
        g_stats = FeatureTypeStatsNode(
            feature_type=ftype,
            count=stats['count'],
            total_length=stats['total_length'],
            min_length=stats['min_length'], 
            max_length=stats['max_length'],
            mean_length=round(stats['total_length'] / stats['count'], 2) if stats['count'] > 0 else 0
        )
        global_stats_list.append(g_stats)
    return id_to_type, global_stats_list

def build_type_stats_by_parent(pysam_file, region_name, id_to_type):
    type_stats_by_parent = init_type_stats_by_parent()
    for line in pysam_file.fetch(region_name):
        feature = parse_gff_line(line)
        if not feature or 'type' not in feature:
            continue

        ftype = feature['type']
        parent_id = feature.get('parent')
        length = max(0, feature['end'] - feature['start'])

        # Establish parent_type
        parent_type = id_to_type.get(parent_id, None) if parent_id else None
        if parent_type:
            stats = type_stats_by_parent[ftype][parent_type]
            stats['total_length'] += length
            stats['lengths_by_parent'][parent_id] += length
            stats['child_count_per_parent'][parent_id] += 1
            if ftype.lower() == 'exon':
                stats['exon_lengths_by_parent'][parent_id] += length

    return type_stats_by_parent

def calculate_stats_by_parent(type_stats_by_parent, annotation_name, region_name, region_accession):

    """
    Calculate the stats by parent for a given type_stats_by_parent dictionary.
    Returns a list of ParentFeatureTypeStats with the following keys:
    - feature_type: the feature type
    - parent_type: the parent type
    - mean_count: the mean count of the feature type per parent
    - mean_length: the mean length of the feature type per parent
    - mean_spliced_exon_length: the mean spliced exon length of the feature type per parent
    """
    output_stats = []
    for ftype, parent_map in type_stats_by_parent.items():
        for parent_type, data in parent_map.items():
            entry = ParentFeatureTypeStats(
                feature_type=ftype,
                parent_type=None if parent_type == "None" else parent_type,
                annotation_name=annotation_name,
                region_name=region_name,
                region_accession=region_accession,
            )

            # Mean number of features per parent
            if data['child_count_per_parent']:
                entry.mean_count = mean(data['child_count_per_parent'].values())

            # Mean total length per parent
            if data['lengths_by_parent']:
                entry.mean_length = mean(data['lengths_by_parent'].values())

            # Spliced exon length (only applies when current feature_type == 'exon' and parent_type is a transcript-like)
            if data['exon_lengths_by_parent']:
                entry.mean_spliced_exon_length = int(mean(data['exon_lengths_by_parent'].values()))

            output_stats.append(entry)

    return output_stats

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