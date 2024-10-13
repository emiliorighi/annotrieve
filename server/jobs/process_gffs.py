import gzip
import os
from db.models import GenomeAnnotation
import requests
import subprocess
from celery import shared_task
from mongoengine.queryset.visitor import Q
import traceback

ANNOTATIONS_PATH= os.getenv('LOCAL_ANNOTATION_PATH')

@shared_task(name='process_gff_files', ignore_result=False)
def process_gff_files():

    query=(Q(processing_status='pending') | Q(processing_status='error'))
    annotations_to_process = GenomeAnnotation.objects(query)

    print('Count:', annotations_to_process.count())
    for ann_to_process in annotations_to_process:
        
        update_file_state(ann_to_process, 'processing')

        path_dir = create_dir_path(ann_to_process)
        file_name= f"{path_dir}/{ann_to_process.name}"
        try:
            file_to_process_path = download_file_via_http_stream(ann_to_process.source_link, file_name)
            # Step 2: Unzip the file in a memory-efficient way
            sorted_file_name = f"{file_name}.sorted.gff"
            with gzip.open(file_to_process_path, 'rt') as f_in:  # 'rt' mode for reading text from gzip
                with open(sorted_file_name, 'w') as f_out:
                    for line in f_in:
                        f_out.write(line)  # Writing line by line to minimize memory use

            # Step 3: Sort the GFF file using the custom sort function (with streaming)
            sorted_final_file = f"{file_name}.final.sorted.gff"
            sort_gff_stream(sorted_file_name, sorted_final_file)

            # Step 3: Bgzip the sorted file
            bgzipped_file = f"{file_name}.gff.gz"
            with open(sorted_final_file, 'rb') as sorted_f:
                with open(bgzipped_file, 'wb') as out_f:
                    subprocess.run(['bgzip'], stdin=sorted_f, stdout=out_f)

            # Step 4: Index the bgzipped file with Tabix
            subprocess.run(['tabix', '-p', 'gff', bgzipped_file])
            dict_to_update = {
                'bgzip_path':bgzipped_file,
                'tabix_path':f"{bgzipped_file}.tbi"
            }
            annotations_to_process.update(**dict_to_update)
            
            os.remove(file_to_process_path)
            os.remove(sorted_file_name)
            os.remove(sorted_final_file)

            # Step 5: Update state to 'completed'
            update_file_state(ann_to_process, 'completed')
        except Exception as e:
            error_file = f"{file_name}.errors.txt"
            with open(error_file, 'a') as f:
                f.write(f"Exception occurred: {str(e)}\n")
                
                traceback.print_exc(file=f)
            update_file_state(ann_to_process, 'error')

            print(f"Exception logged to {error_file}")
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

def sort_gff_stream(input_file, output_file):
    try:
        # Open the output file for writing
        with open(output_file, 'w') as out_f:

            # Step 1: Stream grep for lines starting with '#'
            grep_headers = subprocess.Popen(['grep', '^#', input_file], stdout=out_f)
            grep_headers.wait()  # Wait for the grep command to finish

            # Step 2: Grep for non-header lines and sort them
            grep_data = subprocess.Popen(['grep', '-v', '^#', input_file], stdout=subprocess.PIPE)
            sort_data = subprocess.Popen(['sort', '-t', '\t', '-k1,1', '-k4,4n'], stdin=grep_data.stdout, stdout=out_f)

            # Close the pipes and ensure subprocesses finish
            grep_data.stdout.close()
            sort_data.wait()

    except Exception as e:
        print(f"An error occurred during sorting: {e}")

def create_dir_path(ann):
    taxid = ann.taxid
    assembly_accession = ann.assembly_accession
    
    # Define the full parent path
    parentpath = f"{ANNOTATIONS_PATH}/{taxid}/{assembly_accession}"
    
    # Use os.makedirs with exist_ok=True to create any missing directories
    if not os.path.exists(parentpath):
        os.makedirs(parentpath, exist_ok=True)
    
    return parentpath

