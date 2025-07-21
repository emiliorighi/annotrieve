import os
import gzip
import requests
import hashlib
import subprocess
import zipfile
import zipstream

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

def create_dir_path(taxid, assembly_accession, path):
    
    # Define the full parent path
    parentpath = f"{path}/{taxid}/{assembly_accession}"
    
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

def get_gff_statistics_streaming(input_file):
    """
    Get statistics about a GFF file using streaming to avoid memory issues.
    
    Args:
        input_file: Path to the GFF file
        
    Returns:
        dict: Statistics about the file
    """
    try:
        # Use awk to count lines and inconsistent regions in a single pass
        # This streams the file without loading it into memory
        awk_script = '''BEGIN {total=0; inconsistent=0; headers=0} 
/^#/ {headers++; next} 
{total++; if ($5 < $4) inconsistent++} 
END {print total, inconsistent, headers}'''
        
        result = subprocess.run([
            'awk', '-F', '\t', awk_script, input_file
        ], capture_output=True, text=True, check=True)
        
        if result.stdout.strip():
            total, inconsistent, headers = map(int, result.stdout.strip().split())
            return {
                'total_data_lines': total,
                'inconsistent_regions': inconsistent,
                'header_lines': headers,
                'valid_regions': total - inconsistent
            }
        else:
            return {'error': 'No output from statistics command'}
            
    except subprocess.CalledProcessError as e:
        return {'error': f'Error getting statistics: {e}'}
    except Exception as e:
        return {'error': f'Unexpected error: {e}'}

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
    inconsistent_lines = []
    inconsistent_cmd = f"awk -F'\\t' '!/^#/ && $5 < $4' {input_file}"
    sort_bgzip_cmd = ['bash', '-c', f"""
                    (
                        # Keep header lines
                        grep '^#' {input_file}
                        # Filter non-header lines: keep only lines where $5 >= $4 (end >= start)
                        # This streams data without loading into memory
                        grep -v '^#' {input_file} | awk -F'\t' '$5 >= $4' | sort -t"`printf '\\t'`" -k1,1 -k4,4n
                    ) | bgzip
                """]
    try:

#        stats = get_gff_statistics_streaming(input_file)
#        if 'error' not in stats:
#            print(f"GFF file statistics: {stats['total_data_lines']} data lines, "
#                    f"{stats['inconsistent_regions']} inconsistent regions will be filtered out")
#        else:
#            errors.append(f"Could not get statistics: {stats['error']}")
        
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

        awk_proc = subprocess.run(['bash', '-c', inconsistent_cmd], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if awk_proc.returncode == 0:
            inconsistent_lines = awk_proc.stdout.strip().split('\n') if awk_proc.stdout.strip() else []
        else:
            errors.append(f"Error extracting inconsistent lines: {awk_proc.stderr.strip()}")

        # Step 3: Index the bgzipped file using tabix and capture stderr
        tabix_process = subprocess.run(['tabix', '-p', 'gff', output_file], stderr=subprocess.PIPE)
        if tabix_process.returncode != 0 and tabix_process.stderr:
            errors.append(tabix_process.stderr.decode('utf-8'))
        
    except subprocess.CalledProcessError as e:
        errors.append(f"An error occurred: {e}")

    return errors, inconsistent_lines
