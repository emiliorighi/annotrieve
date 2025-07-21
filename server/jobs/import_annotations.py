from parsers.genome_annotation import parse_genome_annotation_from_row, parse_inconsistent_feature
from helpers.genome_annotation import save_annotation_errors, update_annotation_errors
from helpers import file as file_helper
from helpers import genomic_regions as genomic_regions_helper
from db.models import GenomeAnnotation, AnnotationError, InconsistentFeature
from helpers import taxonomy as taxonomy_helper
from celery import shared_task
import requests
import os
import time


# URL for the TSV file from GitHub
URL = os.getenv('ANNOTATION_METADATA_URL', 'https://raw.githubusercontent.com/guigolab/genome-annotation-tracker/refs/heads/main/mapped_annotations.tsv')
ANNOTATIONS_PATH= os.getenv('LOCAL_ANNOTATION_PATH', '/server/annotations_data')

class AnnotationProcessingError(Exception):
    """Custom exception for annotation processing errors."""
    pass

@shared_task(name='import_and_process_annotations', ignore_result=False)
def import_and_process_annotations():
    """
    Import annotations from the TSV file, download, sort and bgzip the gff files
    """
    annotations = get_annotations_from_tsv()
    print(f"New annotations to process: {len(annotations)}")
    annotations_with_errors = AnnotationError.objects().scalar('annotation_name')
    #process and save annotations
    #if GenomeAnnotation.objects().count() > 10:
    #    print(f"Reached import limit of {10}")
    #    return
    saved_annotations = 0
    for annotation in annotations:
    #    if saved_annotations >= 10:
    #        print(f"Reached import limit of {10}")
    #        break
        saved = process_and_save_annotation(annotation, annotations_with_errors)
        if saved:
            print(f"Saved annotation {annotation.name} of {annotation.scientific_name}")
            saved_annotations += 1
    print(f"Processed and saved: {saved_annotations} / {len(annotations)}")

def get_annotations_from_tsv():
    """
    Get annotations from the TSV file in a mongo db list of objects
    """
    annotations = []
    existing_annotations = GenomeAnnotation.objects().scalar('name')
    try:
        with requests.get(URL, stream=True) as response:
            response.raise_for_status()
            for row in iterate_tsv_file(response):
                annotation = parse_genome_annotation_from_row(row)
                #skip if annotation already exists or if it is a GCF assembly (for the moment we only want to process GCA assemblies)
                if annotation.name in existing_annotations or 'GCF_' in annotation.assembly_accession:
                    continue

                annotations.append(annotation)
    
    except Exception as e:
        print(f"Unexpected error occurred while fetching TSV file: {e}")

    return annotations

def process_and_save_annotation(annotation_to_process, annotations_with_errors):
    """
    Process and save an annotation with comprehensive error handling.
    
    Args:
        annotation_to_process: The annotation object to process
        annotations_with_errors: Set of annotation names that have errors
        
    Returns:
        bool: True if annotation was successfully saved, False otherwise
    """
    print(f"Processing and saving annotation {annotation_to_process.name} of {annotation_to_process.scientific_name}")
    
    # Initialize file variables
    file_vars = init_file_variables(annotation_to_process)
    saved = False
    
    try:
        # Process the annotation through all stages
        saved = _process_annotation_pipeline(annotation_to_process, file_vars)
        
    except AnnotationProcessingError as e:
        _handle_annotation_errors(annotation_to_process, annotations_with_errors, e)
    except Exception as e:
        _handle_annotation_errors(annotation_to_process, annotations_with_errors, e)
    finally:
        # Clean up files
        file_helper.remove_files(file_vars['files_to_remove'])
        
        # Remove from errors if successfully saved
        if saved and annotation_to_process.name in annotations_with_errors:
            AnnotationError.objects(annotation_name=annotation_to_process.name).delete()
    
    return saved

def _process_annotation_pipeline(annotation_to_process, file_vars):
    """
    Process annotation through the complete pipeline: download, extract, process, and save.
    
    Args:
        annotation_to_process: The annotation object to process
        file_vars: Dictionary containing file paths and cleanup list
        
    Returns:
        bool: True if processing was successful
        
    Raises:
        AnnotationProcessingError: If any step in the pipeline fails
    """
    # Step 1: Download annotation file
    file_vars['file_to_process_path'] = _download_annotation_file(annotation_to_process, file_vars)
    
    # Step 2: Extract and prepare annotation
    checksum, bgzipped_file, inconsistent_count = _extract_and_prepare_annotation(annotation_to_process, file_vars)
    
    # Step 3: Process genomic regions
    _process_genomic_regions(annotation_to_process, bgzipped_file, file_vars)
    
    # Step 4: Save annotation with metadata
    _save_annotation_metadata(annotation_to_process, bgzipped_file, checksum, inconsistent_count)
    
    print(f"Annotation {annotation_to_process.name} of {annotation_to_process.scientific_name} saved!")
    return True

def _download_annotation_file(annotation_to_process, file_vars):
    """Download the annotation file from the source URL."""
    print(f"Downloading from {annotation_to_process.source}")
    file_path = file_helper.download_file_via_http_stream(
        annotation_to_process.original_url, 
        file_vars['file_name']
    )
    file_vars['files_to_remove'].extend([file_path])
    return file_path

def _extract_and_prepare_annotation(annotation_to_process, file_vars):
    """
    Extract, sort, and bgzip the annotation file with inconsistent feature tracking.
    
    Args:
        annotation_to_process: The annotation object to process
        file_vars: Dictionary containing file paths and cleanup list
        
    Returns:
        tuple: (checksum, bgzipped_file_path)
        
    Raises:
        AnnotationProcessingError: If processing fails
    """
    annotation_name = annotation_to_process.name
    scientific_name = annotation_to_process.scientific_name
    start_time = time.time()
    
    try:
        # Step 1: Extract annotation from compressed file
        print(f"Extracting annotation for {annotation_name}")
        extract_start = time.time()
        extracted_file = f"{file_vars['file_name']}.extracted.gff"
        checksum = file_helper.write_content_to_file(file_vars['file_to_process_path'], extracted_file)
        file_vars['files_to_remove'].extend([extracted_file])
        extract_time = time.time() - extract_start
        print(f"Extraction completed in {extract_time:.2f}s")
        
        # Step 2: Sort, filter, and bgzip the annotation
        print(f"Processing GFF file for {annotation_name}")
        process_start = time.time()
        bgzipped_file = f"{file_vars['file_name']}.gff.gz"
        errors, inconsistent_lines = file_helper.sort_and_bgzip_gff(extracted_file, bgzipped_file)
        process_time = time.time() - process_start
        print(f"GFF processing completed in {process_time:.2f}s")
        
        # Step 3: Handle processing errors
        if errors:
            file_vars['files_to_remove'].extend([bgzipped_file, f"{bgzipped_file}.tbi"])
            raise AnnotationProcessingError(
                f"GFF processing errors in {annotation_name} of {scientific_name}: {', '.join(errors)}"
            )
        
        # Step 4: Process inconsistent features
        inconsistent_start = time.time()
        inconsistent_count = _process_inconsistent_features(inconsistent_lines, annotation_name)
        inconsistent_time = time.time() - inconsistent_start
        
        # Step 5: Log processing summary
        total_time = time.time() - start_time
        if inconsistent_count > 0:
            print(f"Processed {annotation_name}: {inconsistent_count} inconsistent features filtered out in {inconsistent_time:.2f}s")
        else:
            print(f"Processed {annotation_name}: No inconsistent features found")
        
        print(f"Total processing time for {annotation_name}: {total_time:.2f}s")
        return checksum, bgzipped_file, inconsistent_count
        
    except Exception as e:
        # Clean up any created files on error
        if 'bgzipped_file' in locals():
            file_vars['files_to_remove'].extend([bgzipped_file, f"{bgzipped_file}.tbi"])
        raise AnnotationProcessingError(
            f"Failed to process annotation {annotation_name}: {str(e)}"
        )

def _process_inconsistent_features(inconsistent_lines, annotation_name):
    """
    Process and store inconsistent features from GFF lines.
    
    Args:
        inconsistent_lines: List of GFF lines with inconsistent regions
        annotation_name: Name of the annotation
        
    Returns:
        int: Number of inconsistent features processed
    """
    if not inconsistent_lines:
        return 0
    
    try:
        # Parse and validate inconsistent features
        inconsistent_features = []
        for line in inconsistent_lines:
            if line.strip():  # Skip empty lines
                try:
                    parsed_feature = parse_inconsistent_feature(line, annotation_name)
                    if parsed_feature:
                        inconsistent_features.append(parsed_feature)
                except Exception as e:
                    print(f"Warning: Failed to parse inconsistent feature line: {line[:100]}... Error: {e}")
                    continue
        
        # Bulk insert inconsistent features if any found
        if inconsistent_features:
            try:
                InconsistentFeature.objects.insert(inconsistent_features)
                print(f"Stored {len(inconsistent_features)} inconsistent features for {annotation_name}")
            except Exception as e:
                print(f"Warning: Failed to store inconsistent features for {annotation_name}: {e}")
        
        return len(inconsistent_features)
        
    except Exception as e:
        print(f"Error processing inconsistent features for {annotation_name}: {e}")
        return 0

def _process_genomic_regions(annotation_to_process, bgzipped_file, file_vars):
    """Process and save genomic regions for the annotation."""
    # Get reference names
    reference_names = file_helper.get_tabix_reference_names(bgzipped_file)
    if not reference_names:
        file_vars['files_to_remove'].extend([bgzipped_file, f"{bgzipped_file}.tbi"])
        raise AnnotationProcessingError(
            f"No reference names found for {annotation_to_process.name} of {annotation_to_process.scientific_name}"
        )
    
    # Save genomic regions
    print(f"Retrieving genomic regions for {annotation_to_process.name} of {annotation_to_process.scientific_name}")
    saved_regions = genomic_regions_helper.handle_genomic_regions(annotation_to_process, reference_names)
    if not saved_regions:
        file_vars['files_to_remove'].extend([bgzipped_file, f"{bgzipped_file}.tbi"])
        raise AnnotationProcessingError(
            f"No genomic regions found for {annotation_to_process.name} of {annotation_to_process.scientific_name}"
        )

def _save_annotation_metadata(annotation_to_process, bgzipped_file, checksum, inconsistent_count):
    """Save the annotation with its metadata."""
    relative_path = bgzipped_file.replace(ANNOTATIONS_PATH, '')
    set_annotations_fields(annotation_to_process, relative_path, checksum)
    #retrieve taxonomy
    ordered_taxons = taxonomy_helper.retrieve_taxons_and_save(annotation_to_process.taxid)
    if not ordered_taxons:
        raise AnnotationProcessingError(
            f"Taxon {annotation_to_process.scientific_name} with taxid {annotation_to_process.taxid} not found in INSDC"
        )
    annotation_to_process.taxon_lineage = [taxon.taxid for taxon in ordered_taxons]
    annotation_to_process.inconsistent_features = inconsistent_count
    annotation_to_process.save()

def _handle_annotation_errors(annotation_to_process, annotations_with_errors, error):
    """Handle annotation processing errors."""
    if annotation_to_process.name not in annotations_with_errors:
        save_annotation_errors(annotation_to_process, str(error))
    else:
        update_annotation_errors(annotation_to_process, str(error))

def iterate_tsv_file(response):
    for line_num, line in enumerate(response.iter_lines(decode_unicode=True), start=1):
        if not line.strip() or line_num == 1:
            continue
        row = line.split('\t')
        if len(row) < 6:
            continue
        yield row

def init_file_variables(annotation_to_process):
    """Initialize file variables for annotation processing."""
    path_dir = file_helper.create_dir_path(annotation_to_process.taxid, annotation_to_process.assembly_accession, ANNOTATIONS_PATH)
    file_name = f"{path_dir}/{annotation_to_process.name}"
    
    return {
        'file_to_process_path': None,
        'extracted_file_name': None,
        'file_name': file_name,
        'files_to_remove': []
    }

def set_annotations_fields(annotation_to_process, relative_path, checksum):
    annotation_to_process.bgzipped_path = relative_path
    annotation_to_process.tabix_path = f"{relative_path}.tbi"
    annotation_to_process.md5_checksum = checksum