from clients import ncbi_datasets
from clients.ncbi_datasets import get_rate_limiting_stats
from db.models import GenomicRegion
from parsers.genomic_region import parse_genomic_region
from parsers.genome_annotation import parse_gff_line
import time


def handle_chromosomes(assembly_accession):
    """
    Handle chromosomes with rate limiting for API calls.
    """
    #get the genomic regions from ncbi
    genomic_regions = ncbi_datasets.get_genomic_regions_from_ncbi(assembly_accession)
    for genomic_region in genomic_regions:
        chr_to_save = parse_genomic_region(genomic_region)
        

def handle_genomic_regions(annotation, reference_names, limit=100):
    """
    Handle genomic regions with rate limiting for API calls.
    
    Args:
        annotation: The annotation object
        reference_names: List of reference names to match
        limit: Limit of reference names to fetch
    Returns:
        list: List of saved genomic regions
    """
    #init a dict to store the reference names and their status
    reference_names_status = {name: False for name in reference_names}

    limit = len(reference_names) + limit #add 100 to the limit to be sure to fetch all reference names
    sequences_args = ['genome', 'accession', annotation.assembly_accession, '--report', 'sequence', '--limit', str(limit)]
    regions_to_save = []
    print(f"Fetching genomic regions for assembly {annotation.assembly_accession}")
    start_time = time.time()
    #get the genomic regions from ncbi
    genomic_regions = ncbi_datasets.get_genomic_regions_from_ncbi(annotation.assembly_accession)
    for genomic_region in genomic_regions:
        accession = genomic_region.get('genbank_accession')
        chr_name = genomic_region.get('chr_name')
        chr_name = str(chr_name)
        if accession in reference_names_status:
    for sequence in ncbi_datasets.stream_jsonlines_from_ncbi(sequences_args):
        accession = sequence.get('genbank_accession')
        chr_name = sequence.get('chr_name')
        chr_name = str(chr_name)
        if accession in reference_names_status:
            reference_names_status[accession] = True
        if chr_name in reference_names_status:
            reference_names_status[chr_name] = True

        if reference_names_status[accession] or reference_names_status[chr_name]:
            sequence_obj = parse_genomic_region(sequence)
            sequence_obj['taxon_lineage'] = annotation.taxon_lineage
            sequence_obj['scientific_name'] = annotation.scientific_name
            sequence_obj['taxid'] = annotation.taxid
            regions_to_save.append(GenomicRegion(**sequence_obj))
    #collect the reference names not found
    try:
        GenomicRegion.objects.insert(regions_to_save)
    except Exception as e:
        print(f"Error saving genomic regions: {e}")
        raise e
    
    #hanlde reference names not found
    processing_time = time.time() - start_time
    stats = get_rate_limiting_stats()
    
    print(f"Saved {len(regions_to_save)} genomic regions for {annotation.assembly_accession}")
    print(f"Processing time: {processing_time:.2f}s, Total API calls: {stats['total_api_calls']}, Total wait time: {stats['total_wait_time']:.2f}s")
    
    return regions_to_save

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