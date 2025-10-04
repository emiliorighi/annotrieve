import csv
import os
import shutil
import subprocess
import shlex
from datetime import datetime
import requests
from db.models import GenomeAnnotation, AnnotationError
from db.embedded_documents import PipelineInfo, IndexedFileInfo
from mongoengine import Q
from helpers import file as file_helper
from .classes import AnnotationToProcess
from helpers import pysam_helper
from .utils import create_batches

PIPELINE_VERSION = os.getenv('PIPELINE_VERSION', '1.0.0')
PIPELINE_METHOD = os.getenv('PIPELINE_METHOD', 'sort | bgzip | tabix')
PIPELINE_NAME = os.getenv('PIPELINE_NAME', 'sort_bgzip_tabix')

PIPELINE_INFO = {
    'name': PIPELINE_NAME,
    'version': PIPELINE_VERSION,
    'method': PIPELINE_METHOD,
}

def handle_annotation_error(annotation_to_process: AnnotationToProcess, error: str):
    """Handle annotation processing errors."""

    source_md5 = annotation_to_process.md5_checksum
    annotation_error = AnnotationError.objects(source_md5=source_md5).first()
    
    if isinstance(error, Exception):
        error = str(error)
    
    if isinstance(error, str):
        error = error.replace('\n', ';')

    if annotation_error:
        annotation_error.error_message = error
        annotation_error.save()

    else:
        annotation_error = annotation_to_process.to_annotation_error(error)
        annotation_error.save()

def get_annotation(md5_checksum: str) -> GenomeAnnotation:
    """
    Get the annotation from the database by md5 checksum
    """
    return GenomeAnnotation.objects(annotation_id=md5_checksum).first()

def fetch_annotations(urls_to_fetch) -> list[AnnotationToProcess]:
    """
    Fetch the annotations from the urls and yield them
    """
    annotations: list[AnnotationToProcess] = []
    for url in urls_to_fetch:
        try:
            with requests.get(url, stream=True) as r:
                r.raise_for_status()
                lines = (line.decode("utf-8") for line in r.iter_lines() if line)
                reader = csv.DictReader(lines, delimiter="\t")
                for row in reader:
                    annotations.append(AnnotationToProcess(**row))
        except Exception as e:
            print(f"Unexpected error occurred while fetching TSV file: {e}")
            continue
    return annotations

def save_annotations(annotations: list[GenomeAnnotation], annotations_path: str, batch_size: int=1000) -> bool:
    """
    Save the annotations to the database and delete the annotation errors
    """
    batches = create_batches(annotations, batch_size)
    saved_annotations = []
    for batch in batches:
        try:
            GenomeAnnotation.objects.insert(batch)
            #DELETE ANNOTATION ERRORS
            md5s = [annotation.source_file_info.uncompressed_md5 for annotation in batch]
            AnnotationError.objects(source_md5__in=md5s).delete()
            saved_annotations.extend(batch)
        except Exception as e:
            #remove files from the annotations present in the batch
            for annotation in batch:
                bgzipped_path = file_helper.get_annotation_file_path(annotation)
                csi_path = f"{bgzipped_path}.csi"
                file_helper.remove_files([bgzipped_path, csi_path], annotations_path)
            print(f"Error saving annotations to the database: {e}")
            continue
    return saved_annotations
    
def filter_annotations_dict_by_field(annotations: list[AnnotationToProcess], field: str, list_of_values: list[str]) -> list[AnnotationToProcess]:
    """
    Filter the annotations by a field and a list of values, return the filtered annotations
    """
    return [annotation for annotation in annotations if getattr(annotation, field) in list_of_values]

def delete_changed_md5_checksum_annotations(annotations: list[GenomeAnnotation], annotations_path: str) -> tuple[int, int]:
    """
    Handle the annotations which incoming md5 checksum changed
    """
    urls = [annotation.source_file_info.url_path for annotation in annotations]
    annotations_to_delete = GenomeAnnotation.objects(source_file_info__url_path__in=urls) #if the path exists, it means the incoming md5 checksum changed 
    deleted_count = annotations_to_delete.count()
    deleted_files_count = remove_files_from_annotations(annotations_to_delete, annotations_path)
    annotations_to_delete.delete()
    return deleted_count, deleted_files_count

def filter_annotations_by_md5_checksum_and_url_path(annotations: list[AnnotationToProcess]) -> list[AnnotationToProcess]:
    """
    Filter out the annotations that already exist (perfect match by source url and md5 checksum) in the database
    """
    urls_to_fetch = [annotation.access_url for annotation in annotations]
    md5s_to_check = [annotation.md5_checksum for annotation in annotations]
    md5s_to_skip = GenomeAnnotation.objects(
        Q(source_file_info__url_path__in=urls_to_fetch) 
        & Q(source_file_info__uncompressed_md5__in=md5s_to_check)
        ).scalar('source_file_info__uncompressed_md5')
    return [annotation for annotation in annotations if annotation.md5_checksum not in md5s_to_skip]

def remove_files_from_annotations(annotations, annotations_path) -> int:
    """
    Remove the files from the annotations
    return the number of files that were deleted
    """
    #collect the paths to delete
    paths = []
    for annotation in annotations:
        path = file_helper.get_annotation_file_path(annotation)
        paths.append(path)
        paths.append(f"{path}.csi")
    deleted_files = file_helper.remove_files(paths, annotations_path)
    return len(deleted_files)

def init_annotation_file_paths(annotations_dir: str, annotation_to_process: AnnotationToProcess) -> tuple[str, str, str]:
    """
    Initialize the file paths for the annotation
    returns:
        full_path: the path to the bgzipped file mapped to the container dir
        relative_path: the relative path to the annotation file, mapped to serve via nginx under /files endpoint
    """
    sub_path = f"{annotation_to_process.taxon_id}/{annotation_to_process.assembly_accession}"
    output_dir = file_helper.create_dir_path(annotations_dir, sub_path)
    file_to_store = f"{annotation_to_process.source_database}_{annotation_to_process.md5_checksum}.gff.gz"
    full_path = f"{output_dir}/{file_to_store}"
    relative_path = f"/{sub_path}/{file_to_store}"
    return full_path, relative_path

def process_annotation_file(annotation_to_process: AnnotationToProcess, tmp_subdir_path: str, bgzipped_path: str, existing_md5_checksum: list[str]) -> tuple[str, int]:
    """
    Process the annotation file and return the md5 checksum and the bgzipped path.
    Steps: download → sort → compute md5 → bgzip → tabix.
    returns:
        uncompressed_md5_checksum: the md5 checksum of the uncompressed file
        file_size: the size of the bgzipped file
    """
    gzipped_downloaded_gff_path = f"{tmp_subdir_path}/{annotation_to_process.md5_checksum}.gff.gz"
    download_gff_file(annotation_to_process, gzipped_downloaded_gff_path)
    if file_helper.file_is_empty_or_does_not_exist(gzipped_downloaded_gff_path):
        raise Exception("Downloaded annotation is empty, skipping...")

    md5_path = f"{tmp_subdir_path}/md5.txt"

    stream_cmd = (
        f"(zcat {shlex.quote(gzipped_downloaded_gff_path)} | grep '^#'; "
        f"zcat {shlex.quote(gzipped_downloaded_gff_path)} | grep -v '^#' | sort -t\"$(printf '\\t')\" -k1,1 -k4,4n) "
        f"| tee >(md5sum | awk '{{print $1}}' > {shlex.quote(md5_path)}) "
        f"| bgzip > {shlex.quote(bgzipped_path)}"
    )

    try:
        stream_proc = subprocess.Popen(["bash", "-lc", stream_cmd], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _, stream_err = stream_proc.communicate()
        if stream_proc.returncode != 0:
            raise Exception(stream_err.decode('utf-8') if stream_err else 'Streaming pipeline failed')
    except subprocess.CalledProcessError as e:
        raise Exception(f"Streaming pipeline error: {e}")

    tabix_cmd = f"tabix -p gff --csi {shlex.quote(bgzipped_path)}"
    try:
        tabix_proc = subprocess.Popen(["bash", "-lc", tabix_cmd], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _, tabix_err = tabix_proc.communicate()
        if tabix_proc.returncode != 0:
            raise Exception(tabix_err.decode('utf-8') if tabix_err else 'Tabix failed')
    except subprocess.CalledProcessError as e:
        raise Exception(f"Tabix error: {e}")

    # Read uncompressed MD5 computed from the sorted stream
    if not os.path.exists(md5_path):
        raise Exception("MD5 file not created by streaming pipeline")
    with open(md5_path, 'r') as f:
        uncompressed_md5_checksum = f.read().strip()
    if not uncompressed_md5_checksum:
        raise Exception("Empty MD5 computed from streaming pipeline")

    if uncompressed_md5_checksum in existing_md5_checksum:
        raise Exception(f"Annotation with md5 checksum {uncompressed_md5_checksum} already exists in the database, skipping...")

    file_size = os.path.getsize(bgzipped_path)
    if file_size == 0:
        raise Exception("Bgzipped sorted annotation is empty, skipping...")
    csi_path = f"{bgzipped_path}.csi"

    if os.path.getsize(csi_path) == 0:
        raise Exception("Tabixing the bgzipped annotation failed, skipping...")

    return uncompressed_md5_checksum, file_size

def init_indexed_file_info(uncompressed_md5_checksum: str, file_size: int, relative_bgzipped_path: str, relative_csi_path: str) -> IndexedFileInfo:
    """
    Initialize the indexed file info
    """
    return IndexedFileInfo(**{
        'uncompressed_md5': uncompressed_md5_checksum,
        'bgzipped_path': relative_bgzipped_path,
        'csi_path': relative_csi_path,
        'file_size': file_size,
        'pipeline': PipelineInfo(**PIPELINE_INFO),
    })

def download_gff_file(annotation_to_process: AnnotationToProcess, downloaded_gff: str) -> str:
    """
    Download the gff file from the original url, 
    keep only those files that are synchronized with the tsv file (by last modified date)
    """
    url = annotation_to_process.access_url
    # Stream the file content using requests
    try:
        with requests.get(url, stream=True) as r:
            r.raise_for_status()  # Check for any errors
            last_modified = get_last_modified_date(r.headers)
            #keep only those files that are synchronized with the tsv file
            if last_modified == annotation_to_process.last_modified:
                with open(downloaded_gff, 'wb') as f:
                # Write the content to the temp file in chunks
                    for chunk in r.iter_content(chunk_size=8192): 
                        f.write(chunk)
    except Exception as e:
        raise e
    return downloaded_gff

def get_sources_and_types(gff_file: str) -> tuple[list[str], list[str]]:
    """
    Get the set of second and third column values from the sorted gff file. return a list of unique values for each column.
    """
    sources = set()
    feature_types = set()
    for line in pysam_helper.stream_gff_file(gff_file):
        fields = line.strip().split('\t')
        if len(fields) < 3:
            continue
        sources.add(fields[1])
        feature_types.add(fields[2])
    return list(sources), list(feature_types)

def get_last_modified_date(headers: dict) -> str:
    """
    This function fetches the last modified date of the annotation file from ncbi ftp server.
    """
    try:
        dt = datetime.strptime(headers.get("Last-Modified"), "%a, %d %b %Y %H:%M:%S %Z")
        return dt.date().isoformat()
    except Exception:
        return None
    
def tabix_gff_file(gff_file):
    """
    Tabix a GFF file, using tabix -p gff -C (create csi index).
    """
    tabix_cmd = ['tabix', '-p', 'gff','-C', gff_file]
    try:
        combined_process = subprocess.Popen(
            tabix_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        _, combined_err = combined_process.communicate()
        if combined_process.returncode != 0 and combined_err:
            print(f"An error occurred: {combined_err.decode('utf-8')}")
            raise Exception(combined_err.decode('utf-8'))
    except subprocess.CalledProcessError as e:
        print(f"An error occurred: {e}")
        raise Exception(f"An error occurred: {e}")

def bgzip_gff_file(gff_file, output_file):
    """
    Bgzip a GFF file, using bgzip -c.
    """
    #check if bgzip is installed
    if not shutil.which('bgzip'):
        print("bgzip is not installed")

    bgzip_cmd = ['bgzip', '-c', gff_file, '>', output_file]
    try:
        with open(output_file, 'wb') as out_f:
            combined_process = subprocess.Popen(
                bgzip_cmd,
                stdout=out_f,
                stderr=subprocess.PIPE
            )
            _, combined_err = combined_process.communicate()
            if combined_process.returncode != 0 and combined_err:
                raise Exception(combined_err.decode('utf-8'))
    except subprocess.CalledProcessError as e:
        raise Exception(f"An error occurred: {e}")

def sort_gff_file(gff_file, output_file):
    """
    Unzip and sort a GFF file, filtering out inconsistent features.
    This function streams data without loading into memory.
    """
    # Handle bgzipped input with zcat
    sort_cmd = f'(zcat {gff_file} | grep "^#"; zcat {gff_file} | grep -v "^#" | sort -t"`printf \'\\t\'`" -k1,1 -k4,4n)'
    
    try:
        with open(output_file, 'wb') as out_f:
            combined_process = subprocess.Popen(
                sort_cmd, 
                shell=True,
                stdout=out_f,
                stderr=subprocess.PIPE
            )
            _, combined_err = combined_process.communicate()
            if combined_process.returncode != 0 and combined_err:
                raise Exception(combined_err.decode('utf-8'))
    except subprocess.CalledProcessError as e:
        raise Exception(f"An error occurred: {e}")
