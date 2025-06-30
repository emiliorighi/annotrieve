

def parse_genomic_region(sequence):
    return {
            'insdc_accession':sequence.get('genbank_accession'),
            'assembly_accession':sequence.get('assembly_accession'),
            'length':sequence.get('length'),
            'role':sequence.get('role'),
            'name':sequence.get('chr_name'),
            'gc_percentage':sequence.get('gc_percentage'),
            'gc_count':sequence.get('gc_count')
            }