import requests
from datetime import datetime
import subprocess
import shutil

def download_gff_file(annotation_to_process, downloaded_gff):
    """
    Download the gff file from the original url, 
    keep only those files that are synchronized with the tsv file (by last modified date)
    """
    url = annotation_to_process.source_info.url_path
    # Stream the file content using requests
    try:
        with requests.get(url, stream=True) as r:
            r.raise_for_status()  # Check for any errors
            last_modified = get_last_modified_date(r.headers)
            #keep only those files that are synchronized with the tsv file
            if last_modified == annotation_to_process.source_info.last_modified:
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
    with open(gff_file, 'r') as f:
        for line in f:
            if line.startswith('#'):
                continue
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
    Tabix a GFF file, using tabix -p gff.
    """
    tabix_cmd = ['tabix', '-p', 'gff', gff_file]
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
