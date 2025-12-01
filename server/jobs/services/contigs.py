import re
from helpers import pysam_helper
from db.models import AnnotationSequenceMap, GenomicSequence, GenomeAnnotation, GenomeAssembly

def handle_alias_mapping(parsed_annotation: GenomeAnnotation, bgzipped_path: str):
    """
    handle the alias mapping for the annotation and store them in the database
    """
    #CHROMOSOMES STEP
    chromosomes = GenomicSequence.objects(assembly_accession=parsed_annotation.assembly_accession)
    
    if chromosomes.count() == 0:
        print(f"No chromosomes found for {parsed_annotation.assembly_accession}, skipping alias mapping")
        return

    chr_aliases_dict = {} #dict with all possible combinations of aliases for the chromosomes
    chr_map = {} #dict uid to chr
    for chr in chromosomes:
        gb = chr.genbank_accession
        rs = chr.refseq_accession
        if gb and rs:
            uid = f"{gb}_{rs}"
        elif gb:
            uid = gb
        elif rs:
            uid = rs
        else:
            uid = str(chr.id)
    
        for alias in chr.aliases:
            chr_aliases_dict[alias] = uid
        chr_map[uid] = chr
    try:
        sequences_to_save = []
        for contig in pysam_helper.stream_contigs_names(bgzipped_path):
            seqid = contig.strip()
            if not seqid:
                continue

            if not seqid in chr_aliases_dict and is_number(seqid):
                seqid = int(seqid) #try with int
            
            if seqid in chr_aliases_dict:
                chr = chr_map[chr_aliases_dict[seqid]]
                sequences_to_save.append(AnnotationSequenceMap(
                    sequence_id=seqid,
                    annotation_id=parsed_annotation.annotation_id,
                    aliases=chr.aliases,
                ))
            elif 'chr' in seqid: #check if chr is contained in the seqid and resolve it to the chromosome
                #get chr and the 2 characters after it
                chr_name = normalize_chr(seqid)
                if chr_name and chr_name in chr_aliases_dict:
                    chr = chr_map[chr_aliases_dict[chr_name]]
                    sequences_to_save.append(AnnotationSequenceMap(
                        sequence_id=seqid,
                        annotation_id=parsed_annotation.annotation_id,
                        aliases=chr.aliases, 
                    ))
        if not sequences_to_save:
            print(f"No sequences to save found for {parsed_annotation.source_file_info.url_path}, chromosomes found in the db {chromosomes.count()} for assembly {parsed_annotation.assembly_accession}")
            return 

        AnnotationSequenceMap.objects.insert(sequences_to_save)
        parsed_annotation.mapped_regions=[sequence_map.sequence_id for sequence_map in sequences_to_save]
    except Exception as e:
        print(f"Error mapping sequences for {parsed_annotation.source_file_info.url_path}: {e}")
        raise e

def is_number(s: str) -> bool:
    return re.match(r'^\d+$', s) is not None

def normalize_chr(s: str) -> str | None:
    # Match "chr" + 1–2 characters (digit/letter/underscore)
    match = re.search(r'(chr[0-9A-Za-z_]{1,2})', s)
    if not match:
        return None

    token = match.group(1)

    # Case: chr01 → normalize to chr1
    if re.match(r'chr0[0-9]$', token):
        return "chr" + token[-1]

    # Case: chrX_ or chr1_ → normalize to chrX or chr1
    if token.endswith("_"):
        return token[:-1]

    return token