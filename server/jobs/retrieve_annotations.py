import requests
from db.models import GenomeAnnotation
from helpers import taxonomy as taxonomy_helper
from celery import shared_task
import os
from parsers.genome_annotation import parse_genome_annotation_from_row

# URL for the TSV file from GitHub
URL = os.getenv('ANNOTATION_METADATA_URL')

@shared_task(name='retrieve_annotations', ignore_result=False)
def retrieve_annotations():
    new_annotations = 0
    existing_annotations = 0
    
    print(f"Retrieving annotations from {URL}")
    # Send the request to retrieve the TSV file with streaming
    with requests.get(URL, stream=True) as response:
        # Ensure the request was successful
        response.raise_for_status()
        # Open the new_annotations_file to write the filtered lines
        for line_num, line in enumerate(response.iter_lines(decode_unicode=True), start=1):
            # Skip empty lines
            if not line.strip():
                continue
            # Skip the header (first line)
            if line_num == 1:
                continue
            # Split the line by tab to process the data
            row = line.split('\t')
            if len(row) < 6:
                continue
            
            genome_annotation = parse_genome_annotation_from_row(row)

            if 'GCF_' in genome_annotation.assembly_accession: #for the moment we only want to process GCA assemblies
                continue
            print(f"Genome annotation source: {genome_annotation.source}")

            organism_tax_id=genome_annotation.taxid
            organism_name=genome_annotation.scientific_name
            
            # Check if this annotation already exists in the database
            if GenomeAnnotation.objects(name=genome_annotation.name).count() > 0:
                existing_annotations+=1
                continue

            print(f"Retrieving taxons for {organism_name} with taxid {organism_tax_id}")
            ordered_taxons = taxonomy_helper.retrieve_taxons_and_save(organism_tax_id)
            if not ordered_taxons:
                print(f"Taxons {organism_name} with taxid {organism_tax_id} not found in INSDC")
                print('Skipping annotation')
                continue

            genome_annotation.taxon_lineage = [taxon.taxid for taxon in ordered_taxons] #from root to target taxid
            genome_annotation.save()
            new_annotations+=1

    print(f"New annotations saved: {new_annotations}")
    print(f"Existing annotations: {existing_annotations}")
