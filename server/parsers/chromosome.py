from db.models import Chromosome

def parse_chromosomes_from_ncbi_datasets(sequences, accession):
    ##filter out scaffolds
    chromosomes_to_save=[]
    for sequence in sequences:
        if sequence.get('role') == 'assembled-molecule':
            chr_to_save = Chromosome(**sequence)
            chr_to_save.assembly_accession=accession
            
            chromosomes_to_save.append(chr_to_save)
    return chromosomes_to_save