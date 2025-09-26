from clients.ncbi_datasets import get_chromosomes_from_ncbi
from parsers.chromosome import parse_chromosome
from db.models import Chromosome


def handle_chromosomes(assembly_accession):
    """
    Handle chromosomes with rate limiting for API calls.
    return the number of chromosomes saved
    """
    #get the chromosomes from ncbi
    chromosomes = get_chromosomes_from_ncbi(assembly_accession)
    chromosomes_to_save = []
    if not chromosomes:
        raise Exception(f"No chromosomes found for assembly {assembly_accession}")
    
    for chromosome in chromosomes:
        chromosome_obj = parse_chromosome(chromosome)
        chromosomes_to_save.append(chromosome_obj)
    try:
        Chromosome.objects.insert(chromosomes_to_save)
        return len(chromosomes_to_save)
    except Exception as e:
        print(f"Error saving chromosomes: {e}")
        raise e