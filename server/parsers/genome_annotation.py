from db.models import GenomeAnnotation
import re

def parse_genome_annotation_from_row(row):
    annotation_name=row[0]
    accession=row[1]
    assminfo_name=row[2]
    organism_name=row[3]
    organism_tax_id=row[4]
    full_path=row[5]
    source = 'ensembl' if 'ensembl' in full_path else 'ncbi'

    return GenomeAnnotation(
        name=annotation_name,
        assembly_accession=accession,
        assembly_name=assminfo_name,
        scientific_name=organism_name,
        taxid=organism_tax_id,
        original_url=full_path,
        source=source,
        status='pending'
    )


def parse_gff_line(line):
    """
    Parse a GFF line and extract relevant information.
    
    Args:
        line (str): GFF line tab separated
        
    Returns:
        dict: Parsed GFF feature with id and parent, type, start, end
    """
    parts = line.strip().split('\t')
    if len(parts) < 9:
        return None
    
    # Parse attributes (9th column)
    id, parent = get_id_and_parent(parts[8])
    
    # Handle multiple parents (comma-separated)
    if parent and ',' in parent:
        parent = parent.split(',')[0].strip()  # Take the first parent
    
    return {
        'type': parts[2],
        'start': int(parts[3]),
        'end': int(parts[4]),
        'id': id,
        'parent': parent,
    }

def get_id_and_parent(attributes_str):
    """
    Parse GFF attributes string into a dictionary.
    
    Args:
        attributes_str (str): GFF attributes string (9th column)
        
    Returns:
        tuple: (id, parent) attributes
    """
    id = None
    parent = None
    if not attributes_str or attributes_str == '.':
        return (None, None)
    
    # Split by semicolon and handle quoted values    
    for part in re.split(r';(?=(?:[^"]*"[^"]*")*[^"]*$)', attributes_str):
        part = part.strip()
        if '=' in part:
            key, value = part.split('=', 1)
            value = value.strip()
            if value.startswith('"') and value.endswith('"'):
                value = value[1:-1]
            if key.lower() == 'id':
                id = value
            if 'parent' in key.lower():
                parent = value
    
    return (id, parent)

    """
    Parse the feature stats and return a list of GenomicFeatureCountNode objects
    """
    stats_nodes = []
    for feature_type, stats in features_by_type.items():
        node = GenomicFeatureCountNode(
            annotation_name=annotation.name,
            taxid=annotation.taxid,
            scientific_name=annotation.scientific_name,
            assembly_accession=annotation.assembly_accession,
            taxon_lineage=annotation.taxon_lineage,
            region_name=region_name,
            region_accession=annotation.assembly_accession,
            feature_type=feature_type,
            count=stats['count'],
            average_length=stats['average_length'],
            total_length=stats['total_length'],
            min_length=stats['min_length'],
            max_length=stats['max_length'],
            parent=list(parent_map.get(feature_type, []))[0] if feature_type in parent_map else None,
            children=list(child_map.get(feature_type, [])),
        )
        stats_nodes.append(node)
    return stats_nodes