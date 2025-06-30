from helpers import data as data_helper, genome_annotation as genome_annotation_helper, query_visitors as q
from db.models import FeatureTypeStatsNode


def get_feature_type_stats(args):
    query = {**args}
    return data_helper.get_items('feature_types', query)

def get_feature_types(annotation_name, region_name=None):
    query = {'annotation_name': annotation_name}
    if region_name:
        query['region_name'] = region_name
    feature_types = FeatureTypeStatsNode.objects(**query).distinct('feature_type')
    return data_helper.dump_json(feature_types)

def get_feature_type_stats_tree(annotation_name, region_name=None):
    query = {'annotation_name': annotation_name}
    #check annotation exists
    genome_annotation_helper.get_annotation(annotation_name)
    if region_name:
        query['region_name'] = region_name
        nodes = FeatureTypeStatsNode.objects(**query)
        tree = genome_annotation_helper.build_hierarchy(nodes)
    else:
        nodes = FeatureTypeStatsNode.objects(annotation_name=annotation_name)
        tree = genome_annotation_helper.build_merged_hierarchy(nodes)
    
    return data_helper.dump_json(tree)