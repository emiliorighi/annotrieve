from db.models import Chromosome

def parse_chromosome(sequence):
    return Chromosome(
                insdc_accession=sequence.get('genbank_accession'),
                assembly_accession=sequence.get('assembly_accession'),
                length=sequence.get('length'),
                chr_name=sequence.get('chr_name'),
                gc_percentage=sequence.get('gc_percentage'),
                gc_count=sequence.get('gc_count'),
                sequence_name=sequence.get('sequence_name')
            )