from clients import ncbi_datasets
from clients.ncbi_datasets import get_rate_limiting_stats
from db.models import GenomicRegion
from parsers.genomic_region import parse_genomic_region
from parsers.genome_annotation import parse_gff_line
import time

def handle_genomic_regions(annotation, reference_names):
    """
    Handle genomic regions with rate limiting for API calls.
    
    Args:
        annotation: The annotation object
        reference_names: List of reference names to match
        
    Returns:
        list: List of saved genomic regions
    """
    sequences_args = ['genome', 'accession', annotation.assembly_accession, '--report', 'sequence']
    saved_regions = []
    
    print(f"Fetching genomic regions for assembly {annotation.assembly_accession}")
    start_time = time.time()
    
    for sequence in ncbi_datasets.stream_jsonlines_from_ncbi(sequences_args):
        accession = sequence.get('genbank_accession')
        chr_name = sequence.get('chr_name')
        chr_name = str(chr_name)

        if accession in reference_names or chr_name in reference_names:
            sequence_obj = parse_genomic_region(sequence)
            sequence_obj['taxon_lineage'] = annotation.taxon_lineage
            sequence_obj['scientific_name'] = annotation.scientific_name
            sequence_obj['taxid'] = annotation.taxid
            g_region = GenomicRegion(**sequence_obj).save()
            saved_regions.append(g_region)
    
    processing_time = time.time() - start_time
    stats = get_rate_limiting_stats()
    
    print(f"Saved {len(saved_regions)} genomic regions for {annotation.assembly_accession}")
    print(f"Processing time: {processing_time:.2f}s, Total API calls: {stats['total_api_calls']}, Total wait time: {stats['total_wait_time']:.2f}s")
    
    return saved_regions

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