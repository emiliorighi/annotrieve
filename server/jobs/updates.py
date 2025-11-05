from celery import shared_task
from db.models import GenomeAssembly
from clients import ncbi_datasets as ncbi_datasets_client
import os

TMP_DIR = "/tmp"

@shared_task(name='update_fields', ignore_result=False)
def update_fields():
    """
    Update the fields for the assemblies
    """
    accessions = GenomeAssembly.objects().scalar('assembly_accession')
    assemblies_path = os.path.join(TMP_DIR, f'assemblies_to_update.txt')
    with open(assemblies_path, 'w') as f:
        for accession in accessions: 
            f.write(accession + '\n')
    cmd = ['genome', 'accession', '--inputfile', assemblies_path]
    ncbi_report = ncbi_datasets_client.get_data_from_ncbi(cmd)
    report = ncbi_report.get('reports', [])
    #remove the tmp file
    if not report:
        print(f"No report found for {assemblies_path}")
    for assembly in report:
        assembly_accession = assembly.get('accession')
        assembly_info = assembly.get('assembly_info', {})
        assembly_level = assembly_info.get('assembly_level')
        assembly_status = assembly_info.get('assembly_status')
        assembly_type = assembly_info.get('assembly_type')
        refseq_category = assembly_info.get('refseq_category')
        GenomeAssembly.objects(assembly_accession=assembly_accession).update(assembly_level=assembly_level, assembly_status=assembly_status, assembly_type=assembly_type, refseq_category=refseq_category)
    os.remove(assemblies_path)
    print("Updated assemblies fields")