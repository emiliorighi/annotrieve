import gzip
import os
from db.models import GenomeAnnotation
import requests
import subprocess
from celery import shared_task
from mongoengine.queryset.visitor import Q

ANNOTATIONS_PATH= '/server/annotations_data'

@shared_task(name='process_gff_files', ignore_result=False)
def process_gff_files():
    
    query=(Q(processing_status='pending') | Q(processing_status='error'))
    annotations_to_process = GenomeAnnotation.objects(query)

    for ann_to_process in annotations_to_process:
        
        update_file_state(ann_to_process, 'processing')
        try:
            path_dir = create_dir_path(ann_to_process)

            file_name= f"{path_dir}/{ann_to_process.name}"

            file_to_process_path = download_file_via_http_stream(ann_to_process.source_link, file_name)
            # Step 2: Unzip the file in a memory-efficient way
            sorted_file_name = f"{file_name}.sorted.gff"
            with gzip.open(file_to_process_path, 'rb') as f_in:
                with open(sorted_file_name, 'wb') as f_out:
                    subprocess.run(['gt', 'gff3', '-sortilines','-tidy', '-retainids'], stdin=f_in, stdout=f_out)
            # Step 3: Bgzip the sorted file
            bgzipped_file = f"{file_name}.gff.gz"
            subprocess.run(['bgzip', '-c', sorted_file_name], stdout=open(bgzipped_file, 'wb'))

            # Step 4: Index the bgzipped file with Tabix
            subprocess.run(['tabix', '-p', 'gff', bgzipped_file])

            os.remove(file_to_process_path)
            os.remove(sorted_file_name)

            # Step 5: Update state to 'completed'
            update_file_state(ann_to_process, 'completed')

        except Exception as e:
            # Step 6: Update state to 'failed' in case of an error
            update_file_state(ann_to_process, 'error')
            print(e)
            continue


def update_file_state(ann, state):
    ann.update(processing_status=state)

def download_file_via_http_stream(url, file_name):
    try:        
        downloaded_file_name=f"{file_name}.gz"

        # Stream the file content using requests
        with requests.get(url, stream=True) as r:
            r.raise_for_status()  # Check for any errors
            with open(downloaded_file_name, 'wb') as f:
            # Write the content to the temp file in chunks
                for chunk in r.iter_content(chunk_size=8192): 
                    f.write(chunk)
        return downloaded_file_name  
    except Exception as e:
        print(f"Error downloading file via HTTP: {e}")

def create_dir_path(ann):
    taxid = ann.taxid
    assembly_accession = ann.assembly_accession
    
    # Define the full parent path
    parentpath = f"{ANNOTATIONS_PATH}/{taxid}/{assembly_accession}"
    
    # Use os.makedirs with exist_ok=True to create any missing directories
    if not os.path.exists(parentpath):
        os.makedirs(parentpath, exist_ok=True)
    
    return parentpath

