import os
import pysam
from db.models import AnnotationSequenceMap, GenomicSequence
from helpers import file as file_helper

def handle_alias_mapping(parsed_annotation, tmp_dir, index, total):
    """
    handle the alias mapping for the annotation and store them in the database
    """
    #CHROMOSOMES STEP
    print(f"({index}/{total}) Fetching chromosomes")
    chromosomes = GenomicSequence.objects(assembly_accession=parsed_annotation.assembly_accession)
    if chromosomes.count() == 0:
        print(f"({index}/{total}) Error fetching chromosomes for {parsed_annotation.assembly_accession}, it does not exist in the database")
        return False
    print(f"({index}/{total}) Chromosomes fetched")
    #REF NAMES STEP
    print(f"({index}/{total}) Fetching ref names")
    ref_names_path = fetch_and_store_ref_names(parsed_annotation, tmp_dir)
    if not ref_names_path or file_helper.file_is_empty_or_does_not_exist(ref_names_path):
        print(f"({index}/{total}) Error fetching ref names for")
        return False
    print(f"({index}/{total}) Ref names fetched")
    print(f"({index}/{total}) Creating sequence mapping")
    map_created = create_sequence_mapping(parsed_annotation.md5_checksum, chromosomes, ref_names_path)
    if not map_created:
        print(f"({index}/{total}) Error creating sequence mapping")
        return False
        
    print(f"({index}/{total}) Sequence mapping created")
    return map_created

def create_sequence_mapping(md5_checksum, chromosomes, ref_names_path):
    # Pre-build lookup sets for O(1) lookup instead of O(n) linear search
    chromosome_lookup = set()
    
    # Build lookup sets for all possible identifiers
    for chr in chromosomes:
        # Add all possible identifiers to the lookup set
        if chr.chr_name:
            chromosome_lookup.add(chr.chr_name)
        if chr.ucsc_style_name:
            chromosome_lookup.add(chr.ucsc_style_name)
        if chr.genbank_accession:
            chromosome_lookup.add(chr.genbank_accession)
        if chr.refseq_accession:
            chromosome_lookup.add(chr.refseq_accession)
        if chr.sequence_name:
            chromosome_lookup.add(chr.sequence_name)
    
    # Create a mapping from identifier to chromosome for quick access
    identifier_to_chromosome = {}
    for chr in chromosomes:
        identifiers = get_aliases_list(chromosomes)
        for identifier in identifiers:
            if identifier:  # Only add non-empty identifiers
                identifier_to_chromosome[identifier] = chr
    
    sequences_to_save = []
    
    with open(ref_names_path, 'r') as f:
        for line in f:
            sequence_id = line.strip()
            
            if sequence_id in chromosome_lookup:
                chr = identifier_to_chromosome[sequence_id]
                sequences_to_save.append(AnnotationSequenceMap(
                    sequence_id=sequence_id,
                    md5_checksum=md5_checksum,
                    aliases=get_aliases_list(chromosomes),
                ))
    
    try:
        AnnotationSequenceMap.objects.insert(sequences_to_save)
    except Exception as e:
        print(f"Error saving sequence mapping for {md5_checksum}: {e}")
        return False
    return True

def get_aliases_list(chromosomes):
    """
    Get the aliases list for the chromosomes
    """
    aliases_list = []
    for chr in chromosomes:
        if chr.chr_name:
            aliases_list.append(chr.chr_name)
        if chr.ucsc_style_name:
            aliases_list.append(chr.ucsc_style_name)
        if chr.genbank_accession:
            aliases_list.append(chr.genbank_accession)
        if chr.refseq_accession:
            aliases_list.append(chr.refseq_accession)
        if chr.sequence_name:
            aliases_list.append(chr.sequence_name)
    return aliases_list

def fetch_and_store_ref_names(parsed_annotation, tmp_dir):
    """
    Fetch the ref names from the bgzipped path and store them in a temporary file
    """
    path = file_helper.get_annotation_file_path(parsed_annotation)
    ref_names_path = os.path.join(tmp_dir, 'ref_names.txt')
    try:    
        file = pysam.TabixFile(path)
        contigs = file.contigs
        with open(ref_names_path, 'w') as f:
            for contig in contigs:
                f.write(contig + '\n')
        return ref_names_path
    except Exception as e:
        print(f"Error fetching ref names from {path}: {e}")
        return None