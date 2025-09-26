from db.models import GenomeAnnotation, InconsistentFeature
import re
from helpers.mappers import ANNOTATION_SOURCES

def parse_genome_annotation_from_row(row):
    annotation_name=row[0]
    accession=row[1]
    assminfo_name=row[2]
    organism_name=row[3]
    organism_tax_id=row[4]
    full_path=row[5]
    
    # Improved source detection with better pattern matching
    source = detect_source_from_path(full_path)
        
    return GenomeAnnotation(
        name=annotation_name,
        assembly_accession=accession,
        assembly_name=assminfo_name,
        scientific_name=organism_name,
        taxid=organism_tax_id,
        original_url=full_path,
        source=source,
    )

def parse_row_to_dict(row):
    return {
        'annotation_name': row[0],
        'assembly_accession': row[1],
        'assembly_name': row[2],
        'scientific_name': row[3],
        'taxid': row[4],  
        'original_url': row[5],
        'source': detect_source_from_path(row[5]),
        'gff_version': detect_gff_version(row[5])
    }


def parse_dict_to_genome_annotation(annotation):
    return GenomeAnnotation(
        name=annotation['annotation_name'],
        assembly_accession=annotation['assembly_accession'],
        assembly_name=annotation['assembly_name'],
        scientific_name=annotation['scientific_name'],
        taxid=annotation['taxid'],
        original_url=annotation['original_url'],
        source=annotation['source'],
        gff_version=annotation['gff_version']
    )


def detect_gff_version(full_path):
    """
    Detect the GFF version from a file path using improved pattern matching.
    """
    if 'gff3' in full_path.lower():
        return 'gff3'
    return 'gff'

def detect_source_from_path(full_path):
    """
    Detect the source database from a file path using improved pattern matching.
    
    Args:
        full_path (str): The full file path or URL
        
    Returns:
        str: 'ensembl', 'ncbi', or 'other'
    """
    for base_url, source in ANNOTATION_SOURCES.items():
        if base_url in full_path:
            return source
    return 'unknown'
    

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

def parse_inconsistent_feature(line, annotation_name):
    parts = line.strip().split('\t')
    if len(parts) < 9:
        return None
    return InconsistentFeature(
            annotation_name=annotation_name,
            seqid=parts[0],
            source=parts[1],
            type=parts[2],
            start=int(parts[3]),    
            end=int(parts[4]),
            score=None if parts[5] == '.' else float(parts[5]),
            strand=parts[6],
            phase=None if parts[7] == '.' else parts[7],
            attributes=parse_gff_attributes(parts[8])
        )

def parse_gff_attributes(attr_str):
    """
    Parse the 9th column of GFF into a dictionary.
    """
    attributes = {}
    for field in attr_str.strip().split(';'):
        if '=' in field:
            key, value = field.split('=', 1)
            attributes[key.strip()] = value.strip()
    return attributes

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