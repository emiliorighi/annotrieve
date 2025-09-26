import subprocess

def awk_gff_process(filtered_body, inconsistent_file, skipped_file, headers_file_name, region_out_file):
    """
    Awk script to process gff file, outputting to 3 files: filtered, inconsistent and skipped.
    """
    return f"""
    awk -F'\\t' -v OFS='\\t' \\
        -v filtered="{filtered_body}" \\
        -v inconsistent="{inconsistent_file}" \\
        -v skipped="{skipped_file}" \\
        -v region_out="{region_out_file}" '
    BEGIN {{
      line_count = 0;
      only_region = 1;
      prev = "";
    }}

    /^#/ {{
      print > "{headers_file_name}";
      next;
    }}

    function flush() {{
      if (line_count == 1 && only_region == 1) {{
        for (i = 0; i < line_count; i++) print lines[i] >> skipped;
      }} else {{
        for (i = 0; i < line_count; i++) print lines[i] >> filtered;
      }}
    }}

    {{
      if (prev != "" && $1 != prev) {{
        flush();
        line_count = 0;
        only_region = 1;
      }}

      prev = $1;

      if ($4 > $5) {{
        print $0 >> inconsistent;
        next;
      }}

      if ($3 == "region") {{
        print $0 >> region_out;
      }}
      lines[line_count++] = $0;

      if ($3 != "region") {{
        only_region = 0;
      }}
    }}

    END {{
      flush();
    }}'
    """

def extract_gff_headers(gz_input_file):
    return f"zcat {gz_input_file} | grep '^#'"

def sort_gff(gz_input_file):
    return f"""
        zcat {gz_input_file} | grep -v '^#' | sort -t"`printf '\\t'`" -k1,1 -k4,4n
    """

def write_and_bgzip_headers_and_filtered_file(headers_file_name, filtered_file_name, output_file):
    return f"cat {headers_file_name} {filtered_file_name} | bgzip -c > {output_file}"

def bgzip_file_into_output_file(input_file, output_file):
    return f"bgzip -c {input_file} > {output_file}"

def tabix_index(input_file):
    return f"tabix -p gff {input_file}"

def count_lines(input_file):
    return f"wc -l {input_file}"

def run_command_with_error_handling(command: str, description: str, shell: bool = True, **kwargs):
    """
    Execute a command with comprehensive error handling.
    
    Args:
        command: Command to execute
        description: Description for error messages
        shell: Whether to use shell execution
        **kwargs: Additional arguments for subprocess.run
        
    Returns:
        errors: List of errors
        
    """
    errors = []
    try:
        result = subprocess.run(command, shell=shell, capture_output=True, text=True, **kwargs)
        if result.returncode != 0:
            error_msg = f"{description} failed with return code {result.returncode}"
            if result.stderr:
                error_msg += f"\nStderr: {result.stderr}"
            if result.stdout:
                error_msg += f"\nStdout: {result.stdout}"
            errors.append(error_msg)
    except subprocess.TimeoutExpired as e:
        errors.append(f"{description} timed out: {e}")
    except FileNotFoundError as e:
        errors.append(f"{description} failed - command not found: {e}")
    except Exception as e:
        errors.append(f"{description} failed with unexpected error: {e}")
    return errors

def run_command(command: str, shell: bool = True, **kwargs):
    """
    Execute a command.
    
    Args:
        command: Command to execute
        shell: Whether to use shell execution
        **kwargs: Additional arguments for subprocess.run
        
        
    """
    subprocess.run(command, shell=shell, capture_output=True, text=True, **kwargs)
