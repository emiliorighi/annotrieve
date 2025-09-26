

def parse_genomic_region(sequence):
    return {
            'insdc_accession':sequence.get('genbank_accession'),
            'assembly_accession':sequence.get('assembly_accession'),
            'length':sequence.get('length'),
            'assigned_molecule_location_type':sequence.get('assigned_molecule_location_type'),
            'role':sequence.get('role'),
            'name':sequence.get('chr_name'),
            'gc_percentage':sequence.get('gc_percentage'),
            'gc_count':sequence.get('gc_count'),
            'sequence_name':sequence.get('sequence_name')
            }