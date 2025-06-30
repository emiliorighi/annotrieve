import os
from celery import shared_task
from db.models import GenomeAnnotation
from helpers.file import create_dir_path, download_file_via_http_stream, get_tabix_reference_names, sort_and_bgzip_gff, remove_files, write_content_to_file
from helpers.genomic_regions import handle_genomic_regions

ANNOTATIONS_PATH= os.getenv('LOCAL_ANNOTATION_PATH')

@shared_task(name='process_pending_annotations', ignore_result=False)
def process_pending_annotations():
    """
    Process annotations tsv file
    Steps:
    1. Download the annotation tsv file
    2. Parse the annotation tsv file
    3. Process each annotation
    4. Update the annotation with the new paths
    """

    pending_annotations = GenomeAnnotation.objects(status='pending')

    if not pending_annotations:
        print("No annotations to process")
        return
    
    print(f"Annotations to process: {pending_annotations.count()}")

    for ann_to_process in pending_annotations:
        
        print(f"Processing annotation {ann_to_process.name} of {ann_to_process.scientific_name}")
        
        file_to_process_path=None
        extracted_file_name=None
        path_dir = create_dir_path(ann_to_process.taxid, ann_to_process.assembly_accession, ANNOTATIONS_PATH)
        file_name= f"{path_dir}/{ann_to_process.name}"

        try:
            print(f"Downloading from {ann_to_process.source}")
            file_to_process_path = download_file_via_http_stream(ann_to_process.original_url, file_name)
            extracted_file_name = f"{file_name}.extracted.gff"

            print("Extracting annotation")
            checksum = write_content_to_file(file_to_process_path, extracted_file_name)

            bgzipped_file = f"{file_name}.gff.gz"

            print("Sorting and BGZipping annotation")
            errors = sort_and_bgzip_gff(extracted_file_name, bgzipped_file)
            if errors:
                print(f"Errors in {ann_to_process.name} of {ann_to_process.scientific_name}: {', '.join(errors)}")
                dict_to_update = {
                    'errors':errors,
                    'status':'error'
                }
                ann_to_process.update(**dict_to_update)
                continue
            
            ## get regions
            reference_names = get_tabix_reference_names(bgzipped_file)
            if not reference_names:
                print(f"No reference names found for {ann_to_process.name} of {ann_to_process.scientific_name}")
                handle_errors(ann_to_process, ['No reference names found'])
                remove_files([bgzipped_file, f"{bgzipped_file}.tbi"])
                continue
            
            saved_regions = handle_genomic_regions(ann_to_process, reference_names)

            if saved_regions:
                print(f"Saved {len(saved_regions)} genomic regions for {ann_to_process.name} of {ann_to_process.scientific_name}")
            else:
                print(f"No genomic regions found for {ann_to_process.name} of {ann_to_process.scientific_name}")
                handle_errors(ann_to_process, ['No genomic regions found'])
                remove_files([bgzipped_file, f"{bgzipped_file}.tbi"])
                continue

            relative_path = bgzipped_file.replace(ANNOTATIONS_PATH, '')
            dict_to_update = {
                'bgzipped_path':relative_path,
                'tabix_path':f"{relative_path}.tbi",
                'md5_checksum':checksum,
                'status':'completed'
            }

            ann_to_process.update(**dict_to_update)
            print(f"Annotation {ann_to_process.name} of {ann_to_process.scientific_name} updated!")

        except Exception as e:
            handle_errors(ann_to_process, [str(e)])
        finally:
            # Remove files
            remove_files([file_to_process_path, extracted_file_name])

def handle_errors(ann_to_process, errors):
    dict_to_update = {
        'errors':errors,
        'status':'error'
    }
    ann_to_process.update(**dict_to_update)
