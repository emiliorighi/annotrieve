from db.models import GenomeAnnotation, GenomicRegion
from helpers import data as data_helper, file as file_helper
from werkzeug.exceptions import NotFound, BadRequest
import os
import pysam
import re
from collections import defaultdict

ANNOTATIONS_PATH= os.getenv('LOCAL_ANNOTATION_PATH')
ZIP_FOLDER_PATH= os.getenv('ZIP_FOLDER_PATH')

def get_annotations(args, hide_status=True):
    query = {**args}
    print(query)
    if hide_status:
        add_completed_status(query)
        exclude_fields = ['id', 'status', 'errors', 'created_at']
    else:
        exclude_fields = []
    return data_helper.get_items('annotations', query, exclude_fields)

def get_annotation(name):
    ann_obj = GenomeAnnotation.objects(name=name).exclude('id', 'status', 'errors', 'created_at').first()
    if not ann_obj:
        raise NotFound(description=f"Annotation {name} not found")
    return ann_obj

def get_annotation_regions_tabix(name):
    ann = get_annotation(name)
    file_path = file_helper.get_annotation_file_path(ann)
    try:
        file = pysam.TabixFile(file_path)
        reference_names = file.contigs
        existing_regions = GenomicRegion.objects(assembly_accession=ann.assembly_accession)
        #map ref names to regions
        mapped_regions = []
        for existing_region in existing_regions:
            role = existing_region.role
            if existing_region.name in reference_names:
                mapped_regions.append({
                    'gff_region': existing_region.name,
                    'region_alias': existing_region.insdc_accession,
                    'role': role
                })
            elif existing_region.insdc_accession in reference_names:
                mapped_regions.append({
                    'gff_region': existing_region.insdc_accession,
                    'region_alias': existing_region.name,
                    'role': role
                })
        return data_helper.dump_json(mapped_regions)
    except ValueError:
        raise NotFound(description=f"Annotation {name} not found")
    except Exception as e:
        raise BadRequest(description=f"Error fetching annotation {name}: {e}")
    

def get_annotation_regions(name, args):
    ann = get_annotation(name)
    query = {**args}
    query['assembly_accession'] = ann.assembly_accession
    return data_helper.get_items('regions', query)

def get_annotation_region_tabix_stream(name, region_name, start=0, end=None):
    ann = get_annotation(name)
    file_path = file_helper.get_annotation_file_path(ann)
    try:
        file = pysam.TabixFile(file_path)
        return file.fetch(region_name, start, end)
    except ValueError:
        raise NotFound(description=f"Annotation {name} not found")
    except Exception as e:
        raise BadRequest(description=f"Error fetching annotation {name}: {e}")
    
def add_completed_status(query):
    return query.update(status='completed')

    """
    Parse GFF attributes string into a dictionary.
    
    Args:
        attributes_str (str): GFF attributes string (9th column)
        
    Returns:
        dict: Parsed attributes
    """
    attributes = {}
    if not attributes_str or attributes_str == '.':
        return attributes
    
    # Split by semicolon and handle quoted values
    parts = re.split(r';(?=(?:[^"]*"[^"]*")*[^"]*$)', attributes_str)
    
    for part in parts:
        part = part.strip()
        if '=' in part:
            key, value = part.split('=', 1)
            key = key.strip()
            value = value.strip()
            
            # Remove quotes if present
            if value.startswith('"') and value.endswith('"'):
                value = value[1:-1]
            
            attributes[key] = value
    
    return attributes

    """
    Build a hierarchical tree with count statistics for each feature type.
    Merges features of the same type together and sums their counts.
    Children follow the same structure (merged by type).
    
    Args:
        features (list): List of parsed GFF features
        
    Returns:
        dict: Hierarchical tree with counts
    """
    if not features:
        return {
            'type': 'empty',
            'count': 0,
            'children': []
        }
    
    # Create lookup dictionaries
    feature_by_id = {}
    children_by_parent = defaultdict(list)
    
    # Index features by ID and group by parent
    for feature in features:
        if feature and feature['id']:
            feature_by_id[feature['id']] = feature
            if feature['parent']:
                children_by_parent[feature['parent']].append(feature)
        elif feature:  # Handle features without ID but with parent
            # Generate a temporary ID for features without one
            temp_id = f"temp_{len(feature_by_id)}"
            feature['id'] = temp_id
            feature_by_id[temp_id] = feature
            if feature['parent']:
                children_by_parent[feature['parent']].append(feature)
    
    # Find root features (those without parents or with parents not in our dataset)
    root_features = []
    for feature in features:
        if feature and feature['id']:
            if not feature['parent'] or feature['parent'] not in feature_by_id:
                root_features.append(feature)
    
    # If no root features found, try to infer hierarchy by position
    if not root_features and features:
        # Sort features by start position and try to infer parent-child relationships
        sorted_features = sorted(features, key=lambda x: (x['start'], -x['end']))
        
        # Find features that contain others (potential parents)
        for i, feature in enumerate(sorted_features):
            if not feature['parent']:
                # Look for features that are contained within this feature
                for j, other_feature in enumerate(sorted_features):
                    if i != j and not other_feature['parent']:
                        if (other_feature['start'] >= feature['start'] and 
                            other_feature['end'] <= feature['end'] and
                            other_feature['type'] != feature['type']):
                            # Infer parent-child relationship
                            other_feature['parent'] = feature['id']
                            children_by_parent[feature['id']].append(other_feature)
        
        # Re-find root features after inference
        root_features = []
        for feature in features:
            if feature and feature['id']:
                if not feature['parent'] or feature['parent'] not in feature_by_id:
                    root_features.append(feature)
    
    # Build merged tree structure
    def build_merged_tree(feature_ids):
        if not feature_ids:
            return None
        
        # Get the first feature to determine type
        first_feature = feature_by_id.get(feature_ids[0])
        if not first_feature:
            return None
        
        feature_type = first_feature['type']
        
        # Collect all children of all features of this type
        all_children = []
        for feature_id in feature_ids:
            children = children_by_parent.get(feature_id, [])
            all_children.extend(children)
        
        # Group children by type
        children_by_type = defaultdict(list)
        for child in all_children:
            children_by_type[child['type']].append(child['id'])
        
        # Recursively build children nodes (merged by type)
        children_nodes = []
        for child_type, child_ids in children_by_type.items():
            # Recursively build the subtree for this child type
            child_node = build_merged_tree(child_ids)
            if child_node:
                children_nodes.append(child_node)
        
        # Create the node for this type
        node = {
            'type': feature_type,
            'count': len(feature_ids),
            'children': children_nodes
        }
        
        return node
    
    # Group root features by type
    root_features_by_type = defaultdict(list)
    for root_feature in root_features:
        root_features_by_type[root_feature['type']].append(root_feature['id'])
    
    # Build the merged tree structure
    tree_nodes = []
    for feature_type, feature_ids in root_features_by_type.items():
        tree_node = build_merged_tree(feature_ids)
        if tree_node:
            tree_nodes.append(tree_node)
    
    # If we have multiple root types, create a root node
    if len(tree_nodes) > 1:
        return {
            'type': 'root',
            'count': len(features),
            'children': tree_nodes
        }
    elif len(tree_nodes) == 1:
        return tree_nodes[0]
    else:
        return {
            'type': 'empty',
            'count': 0,
            'children': []
        }