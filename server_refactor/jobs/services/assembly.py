import os
from db.models import GenomeAssembly, AssemblyStats, GenomicSequence
from clients import ncbi_datasets as ncbi_datasets_client

def create_ftp_path(accession: str, assembly_name: str) -> str:
    return f"https://ftp.ncbi.nlm.nih.gov/genomes/all/{accession[0:3]}/{accession[4:7]}/{accession[7:10]}/{accession[10:13]}/{accession}_{assembly_name}/{accession}_{assembly_name}_genomic.fna.gz"

def handle_assemblies(accessions: list[str], tmp_dir: str) -> list[str]:
    """
    Fetch assemblies from the accessions, save the new ones and return the list of matched assemblies accessions
    """
    existing_assemblies = GenomeAssembly.objects(assembly_accession__in=accessions).scalar('assembly_accession')
    new_assemblies = [acc for acc in accessions if acc not in existing_assemblies]
    if not new_assemblies:
        return existing_assemblies
    assemblies_path = os.path.join(tmp_dir, 'assemblies.txt')
    with open(assemblies_path, 'w') as f:
        for assembly in new_assemblies:
            f.write(assembly + '\n')

    cmd = ['genome', 'accession', '--inputfile', assemblies_path]
    ncbi_report = ncbi_datasets_client.get_data_from_ncbi(cmd)
    if not ncbi_report:
        print(f"Error fetching assemblies from {assemblies_path} from NCBI, exiting...")
        return []

    assemblies = ncbi_report.get('reports', [])
    if not assemblies:
        print(f"No assemblies found in {assemblies_path} from NCBI, exiting...")
        return []

    for assembly in assemblies:
        assembly_obj = parse_assembly_from_ncbi(assembly)
        assembly_obj.download_url = create_ftp_path(assembly_obj.assembly_accession, assembly_obj.assembly_name)
        try:
            chromosomes = create_new_chromosomes(assembly_obj.assembly_accession)
            if not chromosomes:
                print(f"Error creating chromosomes for {assembly_obj.assembly_accession}, skipping...")
                continue
            assembly_obj.save()
        except Exception as e:
            print(f"Error saving assembly {assembly_obj.assembly_accession}: {e}")
            continue
    
    return GenomeAssembly.objects(assembly_accession__in=accessions).scalar('assembly_accession')


def get_assemblies(annotations, tmp_dir):
    """
    Fetch the assemblies for the annotations and return them as a list of accessions
    """
    accessions_to_fetch = list(set([annotation.get('assembly_accession') for annotation in annotations]))
    valid_assemblies_accessions = handle_assemblies(accessions_to_fetch, tmp_dir)
    return valid_assemblies_accessions

def parse_assembly_from_ncbi(assembly_dict: dict) -> GenomeAssembly:
    assembly_stats = assembly_dict.get('assembly_stats', dict())
    assembly_info = assembly_dict.get('assembly_info', dict())
    organism_info = assembly_dict.get('organism', dict())
    return GenomeAssembly(
        assembly_accession=assembly_dict.get('accession'),
        paired_assembly_accession=assembly_dict.get('paired_accession'),
        assembly_name=assembly_info.get('assembly_name'),
        organism_name=organism_info.get('organism_name'),
        taxid=str(organism_info.get('tax_id')),
        assembly_stats=AssemblyStats(**assembly_stats),
        source_database=assembly_dict.get('source_database'),
    )

def create_new_chromosomes(assembly_accession):
    """
    Create the new chromosomes for the assembly, 
    return the list of new chromosomes, empty list if no new chromosomes are found
    """
    ncbi_chromosomes = ncbi_datasets_client.get_assembled_molecules_from_ncbi(assembly_accession)
    if not ncbi_chromosomes:
        return []
    chromosomes = [GenomicSequence(**sequence) for sequence in ncbi_chromosomes]
    try:
        GenomicSequence.objects.insert(chromosomes)
    except Exception as e:
        print(f"Error saving chromosomes for {assembly_accession}: {e}")
        return []
    return chromosomes