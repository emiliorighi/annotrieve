import csv
import requests
from db.models import GenomeAnnotation, AnnotationError, AnnotationSequenceMap
from db.embedded_documents import SourceInfo, PipelineInfo
from mongoengine import Q
from helpers import file as file_helper

def handle_annotation_error(annotation, error):
    """Handle annotation processing errors."""

    print(f"Error ================================================ {error}")
    if isinstance(error, list):
        error = ', '.join(error)
    source_md5 = annotation.source_info.md5_checksum
    existing_error = AnnotationError.objects(source_info__md5_checksum=source_md5).first()
    if existing_error:
        existing_error.error_message = str(error)
        existing_error.save()

    else:
        AnnotationError(
            assembly_accession=annotation.assembly_accession,
            taxid=annotation.taxid,
            organism_name=annotation.organism_name,
            url_path=annotation.source_info.url_path,
            error_message=error,
            source_md5=source_md5,
            release_date=annotation.source_info.release_date,
            last_modified=annotation.source_info.last_modified,
            source_database=annotation.source_info.database,
        ).save()

def get_annotation(md5_checksum):
    """
    Get the annotation from the database by md5 checksum
    """
    return GenomeAnnotation.objects(source_info__md5_checksum=md5_checksum).first()

def fetch_annotations(urls_to_fetch):
    """
    Fetch the annotations from the urls and yield them
    """
    annotations = []
    for url in urls_to_fetch:
        try:
            with requests.get(url, stream=True) as r:
                r.raise_for_status()
                lines = (line.decode("utf-8") for line in r.iter_lines() if line)
                reader = csv.DictReader(lines, delimiter="\t")
                for row in reader:
                    annotations.append(row)
        except Exception as e:
            print(f"Unexpected error occurred while fetching TSV file: {e}")
            continue
    return annotations

def save_annotations(annotations):
    """
    Save the annotations to the database and delete the annotation errors
    """
    success = False
    try:
        GenomeAnnotation.objects.insert(annotations)
        #DELETE ANNOTATION ERRORS
        md5s = [annotation.source_info.md5_checksum for annotation in annotations]
        AnnotationError.objects(source_md5__in=md5s).delete()
        success = True
    except Exception as e:
        print(f"Error saving annotations to the database: {e}")
    finally:
        return success

def filter_annotations_dict_by_field(annotations, field, list_of_values):
    """
    Filter the annotations by a field and a list of values, return the filtered annotations
    """
    return [annotation for annotation in annotations if annotation.get(field) in list_of_values]

def delete_changed_md5_checksum_annotations(annotations, annotations_path):
    """
    Handle the annotations which incoming md5 checksum changed
    """
    deleted_count = 0
    files_to_delete = []
    urls = [annotation.source_info.url_path for annotation in annotations]
    annotations_to_delete = GenomeAnnotation.objects(source_info__url_path__in=urls) #if the path still exists, it means the md5 checksum changed 
    deleted_count = annotations_to_delete.count()
    for annotation in annotations_to_delete:
        files_to_delete.append(file_helper.get_annotation_file_path(annotation.bgzipped_path))
        files_to_delete.append(f"{file_helper.get_annotation_file_path(annotation.bgzipped_path)}.tbi")
        AnnotationSequenceMap.objects(md5_checksum=annotation.md5_checksum).delete()
    annotations_to_delete.delete()
    for file in files_to_delete:
        file_helper.remove_file_and_empty_parents(file, annotations_path)
    return deleted_count, len(files_to_delete)

def filter_annotations_by_md5_checksum_and_url_path(annotations):
    """
    Filter out the annotations that already exist (perfect match by source url and md5 checksum) in the database or have errors (by md5 checksum)
    """
    urls_to_fetch = set()
    md5s_to_check = set()
    for annotation in annotations:
        urls_to_fetch.add(annotation.get('access_url'))
        md5s_to_check.add(annotation.get('md5_checksum'))

    md5s_to_skip = GenomeAnnotation.objects(
        Q(source_info__url_path__in=list(urls_to_fetch)) 
        & Q(source_info__md5_checksum__in=list(md5s_to_check))
        ).scalar('source_info__md5_checksum')
    errors = AnnotationError.objects(source_md5__in=list(md5s_to_check)).scalar('source_md5')
    return [annotation for annotation in annotations if annotation.get('md5_checksum') not in md5s_to_skip and annotation.get('md5_checksum') not in errors]

def parse_annotation_from_dict(annotation_dict):
    """
    Parse an annotation from a dictionary to a GenomeAnnotation object.
    Expects the following keys:
    - source_database
    - annotation_provider
    - release_date
    - access_url
    - last_modified
    - md5_checksum
    - pipeline_name
    - pipeline_version
    - pipeline_method
    - assembly_accession
    - assembly_name
    - taxid
    - organism_name
    - file_format
    """
    source_info = SourceInfo(
        database=annotation_dict['source_database'],
        provider=annotation_dict['annotation_provider'],
        release_date=annotation_dict['release_date'],
        url_path=annotation_dict['access_url'],
        last_modified=annotation_dict['last_modified_date'],
        md5_checksum=annotation_dict['md5_checksum'],
    )
    if annotation_dict.get('pipeline_name'):
        source_info.pipeline_metadata = PipelineInfo(
            name=annotation_dict.get('pipeline_name'),
            version=annotation_dict.get('pipeline_version'),
            method=annotation_dict.get('pipeline_method'),
        )
    return GenomeAnnotation(
            assembly_accession=annotation_dict['assembly_accession'],
            assembly_name=annotation_dict['assembly_name'],
            taxid=annotation_dict['taxon_id'],
            organism_name=annotation_dict['organism_name'],
            source_info=source_info,
            format=annotation_dict['file_format'],
        )

def remove_files_from_annotations(annotations, annotations_path):
    """
    Remove the files from the annotations
    """
    for annotation in annotations:
        path = file_helper.get_annotation_file_path(annotation)
        file_helper.remove_file_and_empty_parents(path, annotations_path)
        file_helper.remove_file_and_empty_parents(f"{path}.tbi", annotations_path)

