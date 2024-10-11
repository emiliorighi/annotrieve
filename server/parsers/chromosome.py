from db.models import Chromosome

def parse_chromosomes_from_ncbi_datasets(sequences):
    ##filter out scaffolds
    chromosomes_to_save=[]
    for sequence in sequences:
        if sequence.get('role') == 'assembled-molecule':
            chromosomes_to_save.append(Chromosome(**sequence))
    return chromosomes_to_save