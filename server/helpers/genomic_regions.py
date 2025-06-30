from clients import ncbi_datasets
from db.models import GenomicRegion
from parsers.genomic_region import parse_genomic_region

def handle_genomic_regions(annotation, reference_names):
    sequences_args = ['genome', 'accession', annotation.assembly_accession, '--report', 'sequence']
    saved_regions = []
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
    return saved_regions

