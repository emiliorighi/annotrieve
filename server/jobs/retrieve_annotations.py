import requests
from db.models import GenomeAnnotation,Assembly
from helpers import organism as organism_helper, assembly as assembly_helper
from parsers import annotation as annotation_parser
from celery import shared_task

# URL for the TSV file from GitHub
URL = "https://raw.githubusercontent.com/guigolab/genome-annotation-tracker/refs/heads/main/mapped_annotations.tsv"

#expected header
HEADER={
    'name':0,
    'assembly_accession':1,
    'assembly_name':2,
    'scientific_name':2,
    'taxid':4,
    'source_link':5
}

@shared_task(name='get_annotations', ignore_result=False)
def get_annotations():
    # Send the request to retrieve the TSV file with streaming
    with requests.get(URL, stream=True) as response:
        # Ensure the request was successful
        if response.status_code != 200:
            print(f"Failed to retrieve the file. Status code: {response.status_code}")
            return
        
        # Stream and process each line
        for line_num, line in enumerate(response.iter_lines(decode_unicode=True), start=1):
            # Skip empty lines
            if not line.strip():
                continue
                # Handle the header (first line)
            if line_num != 1:

                try:
                # Split the data line by tab and process it
                    row = line.split('\t')

                    annot_obj=annotation_parser.parse_annotation(row)

                    if GenomeAnnotation.objects(name=annot_obj.name).first():
                        continue

                    organism = handle_organism(annot_obj)
                    if not organism:
                        continue
                    
                    assembly = handle_assembly(annot_obj,organism)
                    if not assembly:
                        continue

                except Exception as e:
                    print(e)
                

def handle_organism(annot_obj):
    organism = organism_helper.handle_organism(annot_obj.taxid)
    if organism:
        return organism
    print(f"Organisms {annot_obj.scientific_name} with taxid {annot_obj.taxid} not found in INSDC")


def handle_assembly(annot_obj, organism):
    assembly = Assembly.objects(accession=annot_obj.assembly_accession).first()
    if assembly:
        return assembly
    
    assembly = assembly_helper.get_assembly_from_ncbi(annot_obj.assembly_accession)
    if not assembly:
        print(f"Assembly {annot_obj.assembly_name} with accession {annot_obj.assembly_accession} not found in INSDC")
        return
    
    assembly_helper.save_chromosomes(assembly)
    assembly.taxon_lineage = organism.taxon_lineage
    assembly.save()
    return assembly
