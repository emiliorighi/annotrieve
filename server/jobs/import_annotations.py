from parsers.genome_annotation import parse_row_to_dict, parse_dict_to_genome_annotation
from helpers import file as file_helper
from helpers import stream as stream_helper, download as download_helper, shell_commands as shell_commands
from db.models import GenomeAnnotation, AnnotationError, Chromosome
from helpers import taxonomy as taxonomy_helper
from clients import ncbi_datasets
from celery import shared_task
import requests
import os
import json
from parsers.chromosome import parse_chromosome

# URL for the TSV file from GitHub
URL = os.getenv('ANNOTATION_METADATA_URL', 'https://raw.githubusercontent.com/guigolab/genome-annotation-tracker/refs/heads/main/mapped_annotations.tsv')
ANNOTATIONS_PATH= os.getenv('LOCAL_ANNOTATION_PATH', '/server/annotations_data')
TMP_DIR = os.getenv('TMP_DIR', '/server/tmp')

class AnnotationProcessingError(Exception):
    """Custom exception for annotation processing errors."""
    pass

@shared_task(name='import_and_process_annotations', ignore_result=False)
def import_and_process_annotations():
    """
    Import annotations from a TSV file, download, sort, filter and bgzip the gff files
    GFF file must have a region feature for top level sequences.
    GFF file and annotation metadata are processed in 10 steps:
    1. download gff file
    2. launch awk script to process file
    3. write and bgzip header and filtered file
    4. index filtered file
    5. bgzip inconsistent and skipped files
    6. count lines in inconsistent and skipped files
    7. retrieve chromosomes from ncbi
    8. save chromosomes to db
    9. retrieve taxonomy
    10. save metadata to db
    """

    annotations_file = os.path.join(TMP_DIR, 'annotations.jsonl')
    os.makedirs(TMP_DIR, exist_ok=True)

    new_annotations_count = get_annotations_from_tsv(annotations_file)
    if new_annotations_count == 0:
        print("No annotations to process")
        return

    print(f"New annotations to process: {new_annotations_count}")
    
    saved_annotations = 0
    annotations_with_errors = 0
    #stream annotations jsonlines from file and process them
    for annotation in stream_helper.stream_jsonl_file(annotations_file):
        print(f"Processing annotation: {annotation['name']}")

        #parse annotation to mongo db object
        annotation_to_save = parse_dict_to_genome_annotation(annotation)

        saved = process_annotation_pipeline(annotation_to_save)

        if saved:
            print(f"Annotation {annotation['name']} saved")
            saved_annotations += 1

        else:   
            print(f"Annotation {annotation['name']} not saved")
            annotations_with_errors += 1

    print(f"Saved a total of {saved_annotations} annotations")
    print(f"Failed to save {annotations_with_errors} annotations")
    
def process_annotation_pipeline(annotation_to_save):
    """
    Process an annotation through the complete pipeline: 
    download, filter, sort, bgzip, index, process inconsistent and skipped files, process genomic regions and save.
    """
    files_to_remove = []
    saved = False
    try:

        #create output directory
        output_dir = file_helper.create_dir_path(
            annotation_to_save.taxid, 
            annotation_to_save.assembly_accession, 
            annotation_to_save.name, 
            ANNOTATIONS_PATH
        )
        #init temp files
        temp_files = file_helper.init_gff_processing_temp_files()
        files_to_remove.extend(temp_files.values())

        #init bgzipped output files
        bgzipped_output_files = file_helper.init_bgzipped_output_files(output_dir, annotation_to_save)

        #step 1: process gff file
        process_gff_file(annotation_to_save, bgzipped_output_files, temp_files, files_to_remove)

        #step 2: process inconsistent and skipped files
        process_inconsistent_and_skipped_files(temp_files, bgzipped_output_files)

        process_reference_names(annotation_to_save, bgzipped_output_files['filtered'])
        #step 3: retrieve and save chromosomes
        process_chromosomes_and_aliases(annotation_to_save, temp_files['region_out'])

        #step 4: process metadata and retrieve taxon lineage
        saved = process_annotation_metadata(annotation_to_save, bgzipped_output_files['filtered'])

    except AnnotationProcessingError as e:
        handle_annotation_errors(annotation_to_save, e)
        files_to_remove.extend(bgzipped_output_files.values()) #remove bgzipped output files if error
    except Exception as e:
        handle_annotation_errors(annotation_to_save, e)
        files_to_remove.extend(bgzipped_output_files.values()) #remove bgzipped output files if error
    finally:
        file_helper.remove_files(files_to_remove)
    return saved

def process_gff_file(annotation_to_process, bgzipped_output_files, temp_files, files_to_remove):
    """
    Process the GFF file: download, filter, sort, bgzip, index.
    """
    #step 1: download gff file
    downloaded_gff = f"{TMP_DIR}/{annotation_to_process.name}.gff.gz"
    print(f"Downloading from {annotation_to_process.original_url}")
    download_helper.download_gff_via_http_stream(
        annotation_to_process.original_url, 
        downloaded_gff
    )
    print(f"Downloaded to {downloaded_gff}")
    files_to_remove.append(downloaded_gff)

    #step 2: launch awk script to process file
    awk_cmd = shell_commands.awk_gff_process(temp_files['filtered'], temp_files['inconsistent'], temp_files['skipped'], temp_files['headers'], temp_files['region_out'])
    print(f"Launching awk script to process file: {downloaded_gff}")
    errors = shell_commands.run_command_with_error_handling(awk_cmd, "Filtering GFF file", executable="/bin/bash")
    if errors:
        raise AnnotationProcessingError(f"Failed to filter GFF file: {errors}")
    print(f"Finished awk script to process file: {downloaded_gff}")

    #step 3: write and bgzip header and filtered file
    print(f"Writing and bgzipping headers and filtered file: {bgzipped_output_files['filtered']}")
    bgzip_cmd = shell_commands.write_and_bgzip_headers_and_filtered_file(temp_files['headers'], temp_files['filtered'], bgzipped_output_files['filtered'])
    errors = shell_commands.run_command_with_error_handling(bgzip_cmd, "Writing and bgzipping headers and filtered file", executable="/bin/bash")
    if errors:
        raise AnnotationProcessingError(f"Failed to write and bgzipping headers and filtered file: {errors}")
    print(f"Finished writing and bgzipping headers and filtered file: {bgzipped_output_files['filtered']}")
    
    #step 4: index filtered file
    tabix_cmd = shell_commands.tabix_index(bgzipped_output_files['filtered'])
    print(f"Indexing filtered file: {bgzipped_output_files['filtered']}")
    errors = shell_commands.run_command_with_error_handling(tabix_cmd, "Indexing filtered file", executable="/bin/bash")
    if errors:
        raise AnnotationProcessingError(f"Failed to index filtered file: {errors}")
    print(f"Finished indexing filtered file: {bgzipped_output_files['filtered']}")
        
def process_inconsistent_and_skipped_files(temp_files, bgzipped_output_files, annotation_to_process):
    """
    Process inconsistent and skipped files.
    """

    for name in ['skipped', 'inconsistent']:
        if os.path.getsize(temp_files[name]) ==  0:
            continue
        #count the number of lines in the fil
        print(f"Processing {name} file: {temp_files[name]}")
        bgzip_cmd = shell_commands.bgzip_file_into_output_file(temp_files[name], bgzipped_output_files[name])
        shell_commands.run_command_with_error_handling(bgzip_cmd, f"Processing {name} file", executable="/bin/bash")

        count = 0
        with open(temp_files[name], 'r') as f:
            count = sum(1 for _ in f)
        print(f"Counted {count} lines in {name} file")
        if name == 'skipped':
            annotation_to_process.skipped_regions_count = count
            annotation_to_process.skipped_regions_path = bgzipped_output_files[name]
        else:
            annotation_to_process.inconsistent_features_count = count
            annotation_to_process.inconsistent_features_path = bgzipped_output_files[name]


def process_chromosomes(annotation):
    """Retrieve and process chromosomes for the annotation."""
    # retrieve chromosome metadata from ncbi
    ncbi_chromosomes = ncbi_datasets.get_chromosomes_from_ncbi(annotation.assembly_accession)
    if not ncbi_chromosomes:
        raise AnnotationProcessingError(
            f"No chromosomes found for {annotation.assembly_name} ({annotation.assembly_accession}) of annotation {annotation.name} of species {annotation.scientific_name}"
        )
    ncbi_chr_length = len(ncbi_chromosomes)

    #check if chromosomes are present in the db
    existing_chromosomes = Chromosome.objects(assembly_accession=annotation.assembly_accession).scalar('insdc_accession')
    if len(existing_chromosomes) == ncbi_chr_length:
        print(f"All chromosomes already present for {annotation.assembly_name} ({annotation.assembly_accession}) of annotation {annotation.name} of species {annotation.scientific_name}")
        return
    
    parsed_chromosomes = [parse_chromosome(chromosome) for chromosome in ncbi_chromosomes]
    new_chromosomes = [chromosome for chromosome in parsed_chromosomes if chromosome.insdc_accession not in existing_chromosomes]
    print(f"Found {len(new_chromosomes)} new chromosomes for {annotation.assembly_name} ({annotation.assembly_accession}) of annotation {annotation.name} of species {annotation.scientific_name}")
    
    try:
        print(f"Saving {len(new_chromosomes)} new chromosomes for {annotation.assembly_name} ({annotation.assembly_accession}) of annotation {annotation.name} of species {annotation.scientific_name}")
        Chromosome.objects.insert(new_chromosomes)
    except Exception as e:
        print(f"Error saving chromosomes for {annotation.assembly_name} ({annotation.assembly_accession}) of annotation {annotation.name} of species {annotation.scientific_name}: {e}")
        raise AnnotationProcessingError(
            f"Error saving chromosomes for {annotation.assembly_name} ({annotation.assembly_accession}) of annotation {annotation.name} of species {annotation.scientific_name}: {e}"
        )


def process_annotation_metadata(annotation, bgzipped_file):
    """Save the annotation with its metadata."""
    relative_path = bgzipped_file.replace(ANNOTATIONS_PATH, '')
    annotation.bgzipped_path = relative_path
    annotation.tabix_path = f"{relative_path}.tbi"

    #retrieve taxonomy
    ordered_taxons = taxonomy_helper.retrieve_taxons_and_save(annotation.taxid)
    if not ordered_taxons:
        raise AnnotationProcessingError(
            f"Taxon {annotation.scientific_name} with taxid {annotation.taxid} not found in INSDC"
        )
    annotation.taxon_lineage = [taxon.taxid for taxon in ordered_taxons]
    try:
        annotation.save()
        return True
    except Exception as e:
        print(f"Error saving annotation metadata for {annotation.assembly_name} ({annotation.assembly_accession}) of annotation {annotation.name} of species {annotation.scientific_name}: {e}")
        raise AnnotationProcessingError(
            f"Error saving annotation metadata for {annotation.assembly_name} ({annotation.assembly_accession}) of annotation {annotation.name} of species {annotation.scientific_name}: {e}"
        )

def handle_annotation_errors(annotation, error):
    """Handle annotation processing errors."""
    if isinstance(error, list):
        error = ', '.join(error)

    existing_error = AnnotationError.objects(annotation_name=annotation.name).first()
    if existing_error:
        existing_error.error_message = str(error)
        existing_error.save()

    else:
        AnnotationError(
            annotation_name=annotation.name,
            assembly_accession=annotation.assembly_accession,
            taxid=annotation.taxid,
            scientific_name=annotation.scientific_name,
            error_message=error
        ).save()

def get_annotations_from_tsv(input_file):
    """
    Get annotations from the TSV file in a mongo db list of objects
    """
    new_annotations = 0
    existing_annotations = GenomeAnnotation.objects().scalar('name')
    try:
        with requests.get(URL, stream=True) as response:
            response.raise_for_status()
            with open(input_file, 'w') as f:
                for row in stream_helper.stream_tsv_file(response):
                    annotation = parse_row_to_dict(row)
                    f.write(json.dumps(annotation) + '\n')

                    #skip if annotation already exists or if it is a GCF assembly (for the moment we only want to process INSDC assemblies)
                if annotation.name in existing_annotations or 'GCF_' in annotation.assembly_accession:
                    continue

                    new_annotations += 1
    
    except Exception as e:
        print(f"Unexpected error occurred while fetching TSV file: {e}")

    return new_annotations
