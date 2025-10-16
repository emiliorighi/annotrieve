import os
import shutil
import random
from celery import shared_task
from helpers import file as file_helper
from .services.classes import AnnotationToProcess
from .services import annotation as annotation_service
from .services import assembly as assembly_service
from .services import contigs as contigs_service
from .services import taxonomy as taxonomy_service
from .services import stats as stats_service
from .services import feature_summary as feature_summary_service
from db.models import GenomeAnnotation
from .services.utils import create_batches

TMP_DIR = "/tmp"
ANNOTATIONS_PATH = os.getenv('LOCAL_ANNOTATIONS_DIR')
GH_PATH = 'https://raw.githubusercontent.com/guigolab/genome-annotation-tracker/refs/heads/main/data/'
URLS_TO_FETCH = [
    GH_PATH + 'ensembl_annotations.tsv',
    GH_PATH + 'genbank_annotations.tsv',
    GH_PATH + 'refseq_annotations.tsv'
]
DEV= os.getenv('DEV')
BATCH_SIZE = 10

@shared_task(name='import_annotations', ignore_result=False)
def import_annotations():
    """
    Orchestrate the import job: fetch → filter → enrich → process → persist → stats → cleanup.
    """
    os.makedirs(TMP_DIR, exist_ok=True)

    print("Starting import annotations job...")
    annotations_to_process = annotation_service.fetch_annotations(URLS_TO_FETCH)

    stats_service.clean_up_empty_models()

    if DEV:
        annotations_to_process = random.sample(annotations_to_process, 10)

    new_annotations_to_process = annotation_service.filter_annotations_by_md5_checksum_and_url_path(annotations_to_process)
    if not new_annotations_to_process:
        print("No new annotations to process after filtering by md5 checksum and url path, exiting...")
        return
    
    valid_lineages = taxonomy_service.handle_taxonomy(new_annotations_to_process, TMP_DIR) #lineages saved in the database, return a dict of taxid:lineage
    new_annotations_to_process = annotation_service.filter_annotations_dict_by_field(
        new_annotations_to_process, 'taxon_id', list(valid_lineages.keys())
    )
    if not new_annotations_to_process:
        print("No new annotations to process after filtering by lineage, exiting...")
        return
    
    valid_accessions = assembly_service.handle_assemblies(new_annotations_to_process, TMP_DIR, valid_lineages)
    new_annotations_to_process = annotation_service.filter_annotations_dict_by_field(
        new_annotations_to_process, 'assembly_accession', valid_accessions
    )

    if not new_annotations_to_process:
        print("No new annotations to process after filtering by assembly, exiting...")
        return

    print(f"Found {len(new_annotations_to_process)} new annotations to process")
    
    existing_annotation_md5s = GenomeAnnotation.objects().scalar('annotation_id') #the annotation id is the md5 of the uncompressed sorted file
    saved_annotations: list[GenomeAnnotation] = []
    for annotations in create_batches(new_annotations_to_process, BATCH_SIZE):
        processed_annotations = process_annotations_pipeline(annotations, valid_lineages, existing_annotation_md5s)
        annotation_service.delete_changed_md5_checksum_annotations(processed_annotations, ANNOTATIONS_PATH)
        saved_annotations.extend(
            annotation_service.save_annotations(
                processed_annotations, ANNOTATIONS_PATH
            )
        )

    if saved_annotations:
        print(f"Saved {len(saved_annotations)} annotations")
        stats_service.update_db_stats(saved_annotations)
    else:
        print("No annotations saved")
    
    print("Cleaning up empty models")
    stats_service.clean_up_empty_models()
    print("Import annotations job successfully finished")

def process_annotations_pipeline(annotations: list[AnnotationToProcess], valid_lineages: dict[str, list[str]], existing_annotation_md5s: list[str]) -> list[GenomeAnnotation]:
    processed_annotations = []
    for annotation_to_process in annotations:
        print(f"Processing {annotation_to_process.access_url}:")
        tmp_subdir_path = file_helper.create_dir_path(TMP_DIR, f"{annotation_to_process.md5_checksum}")
        full_bgzipped_path, relative_bgzipped_path = annotation_service.init_annotation_file_paths(ANNOTATIONS_PATH, annotation_to_process)
        full_csi_path = f"{full_bgzipped_path}.csi"
        relative_csi_path = f"{relative_bgzipped_path}.csi"
        
        try:
            md5_checksum, file_size = annotation_service.process_annotation_file(annotation_to_process, tmp_subdir_path, full_bgzipped_path, existing_annotation_md5s)
            indexed_file_info = annotation_service.init_indexed_file_info(md5_checksum, file_size, relative_bgzipped_path, relative_csi_path)
            feature_summary = feature_summary_service.compute_features_summary(full_bgzipped_path)
            parsed_annotation = annotation_to_process.to_genome_annotation(
                annotation_id=md5_checksum,
                taxon_lineage=valid_lineages.get(annotation_to_process.taxon_id, []),
                indexed_file_info=indexed_file_info,
                features_summary=feature_summary,
            )
            contigs_service.handle_alias_mapping(parsed_annotation, full_bgzipped_path)
            processed_annotations.append(parsed_annotation)
        except Exception as e:
            str_error = str(e)
            print(f"- Error processing annotation {annotation_to_process.access_url}: {str_error}")
            annotation_service.handle_annotation_error(annotation_to_process, str_error)
            file_helper.remove_file_and_empty_parents(full_bgzipped_path, ANNOTATIONS_PATH)
            file_helper.remove_file_and_empty_parents(full_csi_path, ANNOTATIONS_PATH)
        finally:
            shutil.rmtree(tmp_subdir_path)

    return processed_annotations
