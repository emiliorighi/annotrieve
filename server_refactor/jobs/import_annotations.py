import os
import shutil
import random
from celery import shared_task
from helpers import file as file_helper
from jobs.services import annotation as annotation_service
from jobs.services import assembly as assembly_service
from jobs.services import contigs as contigs_service
from jobs.services import gff as gff_service
from jobs.services import taxonomy as taxonomy_service
from jobs.services import stats as stats_service

TMP_DIR = "/tmp"
ANNOTATIONS_PATH = os.getenv('LOCAL_ANNOTATIONS_DIR', '/server/annotations')
URLS_TO_FETCH = [
    os.getenv(
        'ENSEMBL_ANNOTATIONS_TSV_PATH',
        'https://raw.githubusercontent.com/guigolab/genome-annotation-tracker/refs/heads/main/data/ensembl_annotations.tsv'), 
    os.getenv(
        'NCBI_GENBANK_ANNOTATIONS_TSV_PATH', 
        'https://raw.githubusercontent.com/guigolab/genome-annotation-tracker/refs/heads/main/data/genbank_annotations.tsv'), 
    os.getenv(
        'REFSEQ_ANNOTATIONS_TSV_PATH', 
        'https://raw.githubusercontent.com/guigolab/genome-annotation-tracker/refs/heads/main/data/refseq_annotations.tsv')
    ]


STEP_1 = "1. Fetching annotations"
STEP_2 = "2. Filtering annotations by md5 checksum and url path"
STEP_3 = "3. Fetching lineages"
STEP_4 = "4. Filtering annotations by lineages"
STEP_5 = "5. Fetching assemblies"
STEP_6 = "6. Filtering annotations by assemblies"
STEP_7 = "7. Processing annotation files"
STEP_8 = "8. Deleting annotations which incoming md5 checksum changed"
STEP_9 = "9. Saving annotations to the database"
STEP_10 = "10. Updating DB stats"
STEP_11 = "11. Cleaning up empty models"

@shared_task(name='import_annotations', ignore_result=False)
def import_annotations():
    """
    Import the annotations from the TSV files to the database
    """
    os.makedirs(TMP_DIR, exist_ok=True) #init tmp dir
    #drop collections
    # GenomeAnnotation.drop_collection()
    # GenomeAssembly.drop_collection()
    # Organism.drop_collection()
    # GenomicSequence.drop_collection()
    # AnnotationSequenceMap.drop_collection()
    # TaxonNode.drop_collection()

    print("Starting import annotations job...")

    print(f"Starting {STEP_1}...")
    annotations = annotation_service.fetch_annotations(URLS_TO_FETCH)

    #given the size of the annotations, get 6 random annotations
    random.shuffle(annotations)
    annotations = annotations[:6]

    print(f"Found {len(annotations)} potential annotations to process")

    print(f"{STEP_2}")
    filtered_annotations = annotation_service.filter_annotations_by_md5_checksum_and_url_path(annotations)
    print(f"Found {len(filtered_annotations)} new annotations to process")
    if not filtered_annotations:
        print(f"No new annotations to process, exiting job...")
        return

    print(f"{STEP_3}")
    valid_lineages = taxonomy_service.get_lineages(filtered_annotations)
    print(f"Found {len(valid_lineages)} valid organisms")
    print(f"{STEP_4}")
    filtered_annotations = annotation_service.filter_annotations_dict_by_field(filtered_annotations, 'taxon_id', list(valid_lineages.keys()))
    print(f"Found {len(filtered_annotations)} valid annotations to process")
    if not filtered_annotations:
        print(f"No valid annotations to process, exiting job...")
        return
    print(f"{STEP_5}")
    valid_assemblies_accessions = assembly_service.get_assemblies(filtered_annotations, TMP_DIR)
    print(f"Found {len(valid_assemblies_accessions)} assemblies")

    print(f"{STEP_6}")
    filtered_annotations = annotation_service.filter_annotations_dict_by_field(filtered_annotations, 'assembly_accession', valid_assemblies_accessions)
    print(f"Found {len(filtered_annotations)} valid annotations to process")
    if not filtered_annotations:
        print(f"No valid annotations to process, exiting job...")
        return

    print(f"{STEP_7}")
    processed_annotations = process_annotations_pipeline(filtered_annotations, valid_lineages)
    if not processed_annotations:
        print(f"No valid annotations have been fully processed, exiting job...")
        return

    print(f"A total of {len(processed_annotations)} annotations have been fully processed and are ready to be saved")

    print(f"{STEP_8}")
    deleted_count, removed_files_count = annotation_service.delete_changed_md5_checksum_annotations(processed_annotations, ANNOTATIONS_PATH)
    print(f"A total of {deleted_count} annotations have been deleted and {removed_files_count} files have been removed")

    print(f"{STEP_9}")
    success = annotation_service.save_annotations(processed_annotations)
    if not success:
        print(f"Error saving annotations to the database, removing files and exiting job...")
        annotation_service.remove_files_from_annotations(processed_annotations, ANNOTATIONS_PATH)
        return
    print(f"A total of {len(processed_annotations)} annotations have been saved")

    print(f"{STEP_10}")
    stats_service.update_db_stats()
    print(f"DB stats have been updated")

    print(f"{STEP_11}")
    stats_service.clean_up_empty_models()
    print(f"Empty models have been cleaned up")

    print("Import annotations job completed successfully")

def process_annotations_pipeline(annotations, valid_lineages):
    processed_annotations = []
    index = 1
    total = len(annotations)
    for annotation in annotations:
        print(f"({index}/{total}) Processing annotation {annotation.get('access_url')}")
        parsed_annotation = annotation_service.parse_annotation_from_dict(annotation)
        parsed_annotation.taxon_lineage = valid_lineages[parsed_annotation.taxid]
        
        #process the annotation file
        md5_checksum, bgzipped_path, feature_sources, feature_types, file_size_mb = process_annotation_file(parsed_annotation, index, total)
        if not md5_checksum or not bgzipped_path:
            continue

        #SET FIELDS
        parsed_annotation.md5_checksum = md5_checksum
        parsed_annotation.bgzipped_path = bgzipped_path
        parsed_annotation.feature_sources = feature_sources
        parsed_annotation.feature_types = feature_types
        parsed_annotation.file_size_mb = file_size_mb

        map_created = contigs_service.handle_alias_mapping(parsed_annotation, TMP_DIR, index, total)
        if not map_created:
            continue
        #if everything went well, append the annotation to the list
        processed_annotations.append(parsed_annotation)
        print(f"({index}/{total}) Annotation processed successfully")
        index += 1
    return processed_annotations

def process_annotation_file(parsed_annotation, index, total):
    """
    Process the annotation file and return the md5 checksum and the bgzipped path
    """
    #create the tmp directory for the annotation, where the annotation will be downloaded and processed
    tmp_subdir_path = os.path.join(TMP_DIR, f"{parsed_annotation.source_info.md5_checksum}")
    os.makedirs(tmp_subdir_path, exist_ok=True)

    #create the sub path for the annotation, this is what the annotation will be stored in the db
    sub_path = f"/{parsed_annotation.taxid}/{parsed_annotation.assembly_accession}"
    
    #create the output directory for the annotation, where the annotation will be stored
    output_dir = file_helper.create_dir_path(ANNOTATIONS_PATH, sub_path)

    md5_checksum = None
    bgzipped_path = None
    feature_sources = set() # the set of second column values from the sorted gff file
    feature_types = set() # the set of third column values from the sorted gff file
    file_size_mb = None
    try:
        #DOWNLOAD STEP
        print(f"({index}/{total}) Downloading")
        gzipped_downloaded_gff_path = f"{tmp_subdir_path}/{parsed_annotation.source_info.md5_checksum}.gff.gz"
        gff_service.download_gff_file(parsed_annotation, gzipped_downloaded_gff_path)
        if file_helper.file_is_empty_or_does_not_exist(gzipped_downloaded_gff_path):
            raise Exception(f"Downloaded annotation is empty, skipping...")

        #SORTING STEP
        print(f"({index}/{total}) Sorting")
        unzipped_sorted_gff_path = f"{tmp_subdir_path}/{parsed_annotation.source_info.md5_checksum}.sorted.gff"
        gff_service.sort_gff_file(gzipped_downloaded_gff_path, unzipped_sorted_gff_path)
        if file_helper.file_is_empty_or_does_not_exist(unzipped_sorted_gff_path):
            raise Exception(f"Sorted annotation is empty, skipping...")
        
        print(f"({index}/{total}) Fetching feature sources and types")
        feature_sources, feature_types = gff_service.get_sources_and_types(unzipped_sorted_gff_path)

        #MD5 CHECKSUM STEP
        print(f"({index}/{total}) Computing md5 checksum")
        md5_checksum = file_helper.compute_md5_checksum(unzipped_sorted_gff_path)
        existing_annotation = annotation_service.get_annotation(md5_checksum)
        if existing_annotation:
            print(f"({index}/{total}) Annotation already exists in the database from {existing_annotation.source_info.url_path}, skipping...")
            return md5_checksum, bgzipped_path
        
        #BGZIP STEP
        print(f"({index}/{total}) Bgzipping")
        file_to_store = f"{parsed_annotation.source_info.database}_{md5_checksum}.gff.gz"
        bgzipped_sorted_gff_path = f"{output_dir}/{file_to_store}"
        gff_service.bgzip_gff_file(unzipped_sorted_gff_path, bgzipped_sorted_gff_path)
        if file_helper.file_is_empty_or_does_not_exist(bgzipped_sorted_gff_path):
            raise Exception(f"Bgzipped sorted annotation is empty, skipping...")

        #set the bgzipped path for the annotation, this is what the annotation will be stored in the db
        bgzipped_path = f"{sub_path}/{file_to_store}"
        file_size_mb = os.path.getsize(bgzipped_sorted_gff_path) / 1024 / 1024

        #TABIX STEP
        print(f"({index}/{total}) Tabixing")
        gff_service.tabix_gff_file(bgzipped_sorted_gff_path)
        if file_helper.file_is_empty_or_does_not_exist(f"{bgzipped_sorted_gff_path}.tbi"):
            raise Exception(f"Tabixing the bgzipped annotation failed, skipping...")
        print(f"({index}/{total}) Annotation file processed successfully")
    except Exception as e:
        print(f"({index}/{total}) Error processing annotation: {e}")
        annotation_service.handle_annotation_error(parsed_annotation, e)
    finally:
        #in case the annotation was not processed, remove the output directory    
        file_helper.remove_file_and_empty_parents(output_dir, ANNOTATIONS_PATH)
        shutil.rmtree(tmp_subdir_path)
    return md5_checksum, bgzipped_path, feature_sources, feature_types, file_size_mb

