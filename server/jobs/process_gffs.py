import os
import gzip
import requests
import traceback
import subprocess
from celery import shared_task
from mongoengine.queryset.visitor import Q
from db.models import GenomeAnnotation

ANNOTATIONS_PATH= os.getenv('LOCAL_ANNOTATION_PATH')
ERRORS_PATH="/server/errors"

@shared_task(name='process_gff_files', ignore_result=False)
def process_gff_files():

    #test with a couple from ensembl and a couple from ncbi
    query=(Q(processing_status='pending') | Q(processing_status='error'))
    ensembl = Q(source_db='ensembl')
    ncbi = Q(source_db='ncbi')
    ensembl_annotations = GenomeAnnotation.objects(query & ensembl).limit(2)
    ncbi_annotations = GenomeAnnotation.objects(query & ncbi).limit(2)
    # GenomeAnnotation.objects().update(processing_status='pending')

    annotations_to_process = list(ensembl_annotations) + list(ncbi_annotations)

    if not os.path.exists(ERRORS_PATH):
        os.makedirs(ERRORS_PATH)

    print(f"Annotations to process: {annotations_to_process.count()}")

    for ann_to_process in annotations_to_process:
        
        print(f"Processing annotation {ann_to_process.name} of {ann_to_process.scientific_name}")
        
        file_to_process_path=None
        extracted_file_name=None
        error_file = f"{ERRORS_PATH}/{ann_to_process.name}.errors.txt"

        update_file_state(ann_to_process, 'processing')

        path_dir = create_dir_path(ann_to_process)
        file_name= f"{path_dir}/{ann_to_process.name}"

        try:
            print(f"Downloading annotation from {ann_to_process.source_db}")
            file_to_process_path = download_file_via_http_stream(ann_to_process.source_link, file_name)
            extracted_file_name = f"{file_name}.extracted.gff"

            print("Extracing annotation")
            write_content_to_file(file_to_process_path, extracted_file_name)

            bgzipped_file = f"{file_name}.gff.gz"

            print("Sorting and BGZipping annotation")
            sort_and_bgzip_gff(extracted_file_name, bgzipped_file, error_file)

            print("Checking annotation errors")
            has_error_file = check_file_exists_and_not_empty(error_file)
            if has_error_file:
                print(f"Errors in {ann_to_process.name} of {ann_to_process.scientific_name} check: {error_file}")
                print(f"Skipping Annotation..")
                update_file_state(ann_to_process, 'error')
                continue

            print(f"Annotation {ann_to_process.name} of {ann_to_process.scientific_name} is valid")
            relative_path = bgzipped_file.replace(ANNOTATIONS_PATH, '')
            dict_to_update = {
                'bgzip_path':relative_path,
                'tabix_path':f"{relative_path}.tbi"
            }
            print(f"Annotation {ann_to_process.name} of {ann_to_process.scientific_name} pathes: {', '.join(dict_to_update.values())}")

            ann_to_process.update(**dict_to_update)
            print(f"Annotation {ann_to_process.name} of {ann_to_process.scientific_name} updated!")

            update_file_state(ann_to_process, 'completed')
        except Exception as e:

            with open(error_file, 'a') as f:
                f.write(f"Exception occurred: {str(e)}\n")
                traceback.print_exc(file=f)

            update_file_state(ann_to_process, 'error')
            print(f"Exception logged to {error_file}")
        finally:
            # Remove files
            for f in [file_to_process_path, extracted_file_name]:
                if not f or not os.path.exists(f):
                    continue
                os.remove(f)

def check_file_exists_and_not_empty(file_path):
    # Check if the file exists
    if os.path.exists(file_path):
        # Check if the file is not empty
        if os.path.getsize(file_path) > 0:
            return True
        else:
            print(f"The file '{file_path}' is empty.")
            return False
    else:
        print(f"The file '{file_path}' does not exist.")
        return False

def write_content_to_file(file_to_process_path, sorted_file_name):
    with gzip.open(file_to_process_path, 'rt') as f_in:  # 'rt' mode for reading text from gzip
        with open(sorted_file_name, 'w') as f_out:
            for line in f_in:
                f_out.write(line)  # Writing line by line to minimize memory use

def write_to_error_file(stderr, error_file):
    with open(error_file, 'a') as err:
        err.write(stderr.decode('utf-8'))

def update_file_state(ann, state):
    ann.update(processing_status=state)

def download_file_via_http_stream(url, file_name):
    downloaded_file_name=f"{file_name}.gz"

    # Stream the file content using requests
    with requests.get(url, stream=True) as r:
        r.raise_for_status()  # Check for any errors
        with open(downloaded_file_name, 'wb') as f:
        # Write the content to the temp file in chunks
            for chunk in r.iter_content(chunk_size=8192): 
                f.write(chunk)
    return downloaded_file_name  

def create_dir_path(ann):
    taxid = ann.taxid
    assembly_accession = ann.assembly_accession
    
    # Define the full parent path
    parentpath = f"{ANNOTATIONS_PATH}/{taxid}/{assembly_accession}"
    
    # Use os.makedirs with exist_ok=True to create any missing directories
    if not os.path.exists(parentpath):
        os.makedirs(parentpath, exist_ok=True)
    
    return parentpath

def sort_and_bgzip_gff(input_file, output_file, error_file):
    errors = []  # To store error messages

    try:
        # Open the output file for bgzip (sorted.gff.gz)
        with open(output_file, 'wb') as out_f:
            
            # Use a single command to handle headers, sorting, and bgzipping
            combined_process = subprocess.Popen(
                # Step 1: Handle the header lines first (grep "^#"), then sort non-header lines
                ['bash', '-c', f"(grep '^#' {input_file}; grep -v '^#' {input_file} | sort -t\"`printf '\\t'`\" -k1,1 -k4,4n) | bgzip"],                stdout=out_f,
                stderr=subprocess.PIPE
            )
            
            # Wait for the combined process to finish and collect stderr
            _, combined_err = combined_process.communicate()

            # Step 2: Collect errors if any
            if combined_process.returncode != 0 and combined_err:
                errors.append(combined_err.decode('utf-8'))

        # Step 3: Index the bgzipped file using tabix and capture stderr
        tabix_process = subprocess.run(['tabix', '-p', 'gff', output_file], stderr=subprocess.PIPE)
        if tabix_process.returncode != 0 and tabix_process.stderr:
            errors.append(tabix_process.stderr.decode('utf-8'))

    except subprocess.CalledProcessError as e:
        errors.append(f"An error occurred: {e}")

    # Step 4: If there are any errors, write them to the error file
    if errors:
        with open(error_file, 'a') as err_f:
            err_f.write("\n".join(errors))

