import os
import gzip
import requests
import hashlib
import subprocess
import zipfile
import zipstream
import json
import tempfile

ANNOTATIONS_PATH = os.getenv('LOCAL_ANNOTATIONS_DIR')

def get_annotation_file_path(annotation):
    """
    Common function to get the full file path for an annotation.
    Handles cleaning the bgzipped_path by removing leading slash if present.
    """
    if not ANNOTATIONS_PATH:
        raise ValueError("LOCAL_ANNOTATIONS_DIR environment variable is not set")
    
    bgzipped_path = annotation.bgzipped_path.lstrip('/') if annotation.bgzipped_path.startswith('/') else annotation.bgzipped_path
    return os.path.join(ANNOTATIONS_PATH, bgzipped_path)

def remove_files(files):
    for f in files:
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
    md5 = hashlib.md5()

    with gzip.open(file_to_process_path, 'rt') as f_in:
        with open(sorted_file_name, 'w') as f_out:
            for line in f_in:
                f_out.write(line)
                md5.update(line.encode('utf-8'))  # update hash with each line
    checksum = md5.hexdigest()
    return checksum

def read_jsonl_file(file_path):
    with open(file_path, 'r') as f:
        for line in f:
            yield json.loads(line)

def write_filtered_gff_content(file_to_process_path, sorted_file_name):
    """
    Read a GFF file and filter out:
    1. Regions without features (lines without proper GFF structure)
    2. Inconsistent features where start position is less than end position
    
    Args:
        file_to_process_path (str): Path to the input GFF file (gzipped)
        sorted_file_name (str): Path to the output filtered GFF file
        
    Returns:
        dict: Statistics about the filtering process including:
            - total_lines: Total lines processed
            - header_lines: Number of header lines (#)
            - valid_features: Number of valid features written
            - skipped_inconsistent: Number of inconsistent features skipped
            - skipped_invalid: Number of invalid lines skipped
            - checksum: MD5 hash of the output file
    """
    md5 = hashlib.md5()
    stats = {
        'total_lines': 0,
        'header_lines': 0,
        'valid_features': 0,
        'skipped_inconsistent': 0,
        'skipped_invalid': 0
    }
    
    with gzip.open(file_to_process_path, 'rt') as f_in:
        with open(sorted_file_name, 'w') as f_out:
            for line in f_in:
                stats['total_lines'] += 1
                line = line.strip()
                
                # Skip empty lines
                if not line:
                    continue
                
                # Keep header lines (starting with #)
                if line.startswith('#'):
                    f_out.write(line + '\n')
                    md5.update((line + '\n').encode('utf-8'))
                    stats['header_lines'] += 1
                    continue
                
                # Parse GFF line
                parts = line.split('\t')
                
                
                # Skip lines that don't have at least 9 columns (standard GFF format)
                if len(parts) < 9:
                    stats['skipped_invalid'] += 1
                    continue
                
                try:
                    # Extract start and end positions (columns 4 and 5)
                    start_pos = int(parts[3])
                    end_pos = int(parts[4])
                    
                    # Skip inconsistent features where start >= end
                    if start_pos >= end_pos:
                        stats['skipped_inconsistent'] += 1
                        continue
                    
                    # Write valid feature
                    f_out.write(line + '\n')
                    md5.update((line + '\n').encode('utf-8'))
                    stats['valid_features'] += 1
                    
                except (ValueError, IndexError):
                    # Skip lines where start/end positions can't be parsed as integers
                    stats['skipped_invalid'] += 1
                    continue
    
    stats['checksum'] = md5.hexdigest()
    return stats


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

def create_zip_file(files, zip_file_name):
    with zipfile.ZipFile(zip_file_name, 'w') as zipf:
        for file in files:
            zipf.write(file, os.path.basename(file))
    return zip_file_name

def create_zip_stream(files):
    z = zipstream.ZipFile(mode='w', compression=zipstream.ZIP_DEFLATED)
    for file in files:
        z.write(file, os.path.basename(file))
    for chunk in z:
        yield chunk

def create_dir_path(taxid, assembly_accession,annotation_name, path):
    """
    Create a directory path for an annotation, with the annotation name as the last part of the path
    """
    annotation_name = annotation_name.replace(' ', '_')
    # Define the full parent path
    parentpath = f"{path}/{taxid}/{assembly_accession}/{annotation_name}"
    
    # Use os.makedirs with exist_ok=True to create any missing directories
    if not os.path.exists(parentpath):
        os.makedirs(parentpath, exist_ok=True)
    
    return parentpath

def get_tabix_reference_names(file_path):
    try:
        # Run the `tabix -l` command
        result = subprocess.run(
            ['tabix', '-l', file_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True
        )

        # Split the output by newline to get reference names
        reference_names = result.stdout.strip().split('\n')
        return reference_names

    except subprocess.CalledProcessError as e:
        print(f"Error running tabix: {e.stderr.strip()}")
        return []

def get_tabix_reference_names_stream(file_path):
    try:
        # Run the `tabix -l` command and yield lines as they come
        process = subprocess.Popen(
            ['tabix', '-l', file_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        if process.stdout is not None:
            for line in process.stdout:
                yield line.strip()

        # Ensure the process completed successfully
        _, stderr = process.communicate()
        if process.returncode != 0:
            raise subprocess.CalledProcessError(process.returncode, process.args, output=None, stderr=stderr)

    except subprocess.CalledProcessError as e:
        print(f"Error running tabix: {e.stderr.strip()}")
        return  # implicit StopIteration
        
def get_tabix_region_content_stream(file_path, region):
    process = None
    try:
        process = subprocess.Popen(
            ['tabix', file_path, region],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # Yield each line of output as it becomes available
        for line in process.stdout:
            yield line.rstrip('\n')

        # Ensure the process ends cleanly
        return_code = process.wait()
        if return_code != 0:
            error_message = process.stderr.read().strip()
            raise RuntimeError(f"tabix failed: {error_message}")

    except FileNotFoundError:
        raise RuntimeError("tabix command not found. Is it installed?")
    except Exception as e:
        raise RuntimeError(f"Error running tabix: {e}")
    finally:
        # Ensure process is cleaned up
        if process and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()

def region_exists_in_tabix(file_path, region):

    try:
        process = subprocess.Popen(
            ['tabix', file_path, f"{region}:1-1000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        # Read just one line to check if anything is returned
        first_line = process.stdout.readline()
        process.stdout.close()
        process.wait()

        if process.returncode != 0:
            error = process.stderr.read().strip()
            raise RuntimeError(f"tabix error: {error}")

        return bool(first_line.strip())

    except Exception as e:
        print(f"Error: {e}")
        return False

def sort_and_bgzip_gff(input_file, output_file):
    """
    Sort and bgzip a GFF file, filtering out inconsistent features.
    
    Args:
        input_file: Path to input GFF file
        output_file: Path to output bgzipped file
        
    Returns:
        tuple: (list of error messages, list of inconsistent features)
    """
    errors = []  # To store error messages
    sort_bgzip_cmd = ['bash', '-c', f"""
                    (
                        # Keep header lines
                        grep '^#' {input_file}
                        # This streams data without loading into memory
                        grep -v '^#' {input_file} | sort -t"`printf '\\t'`" -k1,1 -k4,4n
                    ) | bgzip
                """]
    try:
        
        # Open the output file for bgzip (sorted.gff.gz)
        with open(output_file, 'wb') as out_f:
            
            # Use a single command to handle headers, filtering, sorting, and bgzipping
            # This approach streams the data without loading it all into memory
            combined_process = subprocess.Popen(
                # Step 1: Handle header lines first (grep "^#")
                # Step 2: Filter non-header lines to remove inconsistent regions (end < start)
                # Step 3: Sort the filtered lines
                # Step 4: bgzip the result
                # All operations are streamed, no memory loading
                sort_bgzip_cmd, 
                stdout=out_f,
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

    return errors


def init_gff_processing_temp_files():
    """
    Initialize temporary files for GFF processing.
    filtered: filtered gff file
    inconsistent: inconsistent gff file
    skipped: skipped gff file
    headers: headers gff file
    region_out: region out gff file
    """
    temp_files = {}
    for name in ["filtered", "inconsistent", "skipped", "headers", "region_out"]:
        temp_file = tempfile.NamedTemporaryFile(mode="w+", delete=False)
        temp_files[name] = temp_file.name
        temp_file.close()
    return 
    
def init_bgzipped_output_files(output_dir, annotation_to_process):
    """
    Initialize bgzipped output files for GFF processing.
    """
    return {
        'filtered': os.path.join(output_dir, f"{annotation_to_process.name}.{annotation_to_process.gff_version}.gz"),
        'inconsistent': os.path.join(output_dir, f"{annotation_to_process.name}.{annotation_to_process.gff_version}.inconsistent.gz"),
        'skipped': os.path.join(output_dir, f"{annotation_to_process.name}.{annotation_to_process.gff_version}.skipped.gz")
    }