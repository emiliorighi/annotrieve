import os
import subprocess
import tempfile
from typing import Dict, Tuple, Optional
from helpers import shell_commands

def _run_command_with_error_handling(command: str, description: str, shell: bool = True, **kwargs) -> subprocess.CompletedProcess:
    """
    Execute a command with comprehensive error handling.
    
    Args:
        command: Command to execute
        description: Description for error messages
        shell: Whether to use shell execution
        **kwargs: Additional arguments for subprocess.run
        
    Returns:
        subprocess.CompletedProcess result
        
    Raises:
        RuntimeError: If command execution fails
    """
    try:
        result = subprocess.run(command, shell=shell, capture_output=True, text=True, **kwargs)
        if result.returncode != 0:
            error_msg = f"{description} failed with return code {result.returncode}"
            if result.stderr:
                error_msg += f"\nStderr: {result.stderr}"
            if result.stdout:
                error_msg += f"\nStdout: {result.stdout}"
            raise RuntimeError(error_msg)
        return result
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"{description} timed out: {e}")
    except FileNotFoundError as e:
        raise RuntimeError(f"{description} failed - command not found: {e}")
    except Exception as e:
        raise RuntimeError(f"{description} failed with unexpected error: {e}")


def _compress_file_with_tabix(input_path: str, output_path: str, file_type: str = "gff") -> None:
    """
    Compress a file with bgzip and create tabix index.
    
    Args:
        input_path: Path to input file
        output_path: Path to output compressed file
        file_type: File type for tabix indexing
        
    Raises:
        RuntimeError: If compression or indexing fails
    """
    # Compress with bgzip
    _run_command_with_error_handling(
        f"bgzip -c {input_path}",
        f"Bgzip compression of {input_path}",
        stdout=open(output_path, 'wb')
    )
    
    # Create tabix index
    _run_command_with_error_handling(
        f"tabix -p {file_type} {output_path}",
        f"Tabix indexing of {output_path}"
    )


def _count_lines_in_file(file_path: str) -> int:
    """
    Count lines in a file.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Number of lines in the file
        
    Raises:
        RuntimeError: If counting fails
    """
    try:
        result = _run_command_with_error_handling(
            f"wc -l {file_path}",
            f"Line counting of {file_path}"
        )
        return int(result.stdout.strip().split()[0])
    except (ValueError, IndexError) as e:
        raise RuntimeError(f"Failed to parse line count for {file_path}: {e}")


def _process_file_with_stats(tmp_path: str, gz_path: str, label: str) -> int:
    """
    Process a temporary file and compress it if non-empty.
    
    Args:
        tmp_path: Path to temporary file
        gz_path: Path to output compressed file
        label: Label for logging
        
    Returns:
        Number of lines in the file
    """
    if os.path.getsize(tmp_path) > 0:
        _compress_file_with_tabix(tmp_path, gz_path)
        count = _count_lines_in_file(tmp_path)
        print(f"📊 {label.capitalize()} lines: {count}")
        return count
    else:
        print(f"📊 {label.capitalize()} lines: 0 (empty file)")
        return 0


def filter_gff_streaming(input_gff_gz: str, output_files: Dict[str, str]) -> Dict[str, int]:
    """
    Filter GFF file streaming with comprehensive error handling and optional command execution.
    
    Args:
        input_gff_gz: Path to input gzipped GFF file
        output_files: Dictionary with output file paths
        
    Returns:
        Dictionary with processing statistics
        
    Raises:
        RuntimeError: If any processing step fails
    """
    # Validate input file exists
    if not os.path.exists(input_gff_gz):
        raise RuntimeError(f"Input file does not exist: {input_gff_gz}")
    
    
    # Create temporary files
    temp_files = {}
    try:
        for name in ["filtered", "inconsistent", "skipped"]:
            temp_file = tempfile.NamedTemporaryFile(mode="w+", delete=False)
            temp_files[name] = temp_file.name
            temp_file.close()
        
        # Step 1: Extract and output headers
        print("📋 Extracting headers...")
        _run_command_with_error_handling(
            f"zcat {input_gff_gz} | grep '^#'",
            "Header extraction",
            stdout=open(temp_files["filtered"], 'w')
        )
        
        # Step 2: Process body with filtering and optional command execution
        print("🔍 Processing and filtering GFF content...")
        
        # Build awk script with optional command execution
        awk_script = shell_commands.awk_gff_filter_script(temp_files["filtered"], temp_files["inconsistent"], temp_files["skipped"])
        
        _run_command_with_error_handling(
            f"zcat {input_gff_gz} | grep -v '^#' | sort -t$'\\t' -k1,1 -k4,4n | {awk_script}",
            "GFF processing and filtering",
            executable="/bin/bash"
        )
        
        # Step 3: Compress filtered file
        print("🗜️ Compressing filtered file...")
        _compress_file_with_tabix(temp_files["filtered"], output_files["filtered"])
        
        # Step 4: Process and compress other files
        stats = {}
        for label in ["inconsistent", "skipped"]:
            stats[label] = _process_file_with_stats(temp_files[label], output_files[label], label)
        
        # Step 5: Calculate final statistics
        stats["filtered"] = _count_lines_in_file(temp_files["filtered"])
        
        print(f"✅ Filtered GFF: {output_files['filtered']} ({stats['filtered']} lines)")
        if stats["inconsistent"] > 0:
            print(f"🛑 Inconsistent lines: {output_files['inconsistent']} ({stats['inconsistent']} lines)")
        if stats["skipped"] > 0:
            print(f"🚫 Skipped contigs: {output_files['skipped']} ({stats['skipped']} lines)")
        
        return stats
        
    except Exception as e:
        # Clean up temporary files on error
        for temp_path in temp_files.values():
            if os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except OSError:
                    pass  # Ignore cleanup errors
        raise RuntimeError(f"GFF filtering failed: {e}")
    
    finally:
        # Clean up temporary files
        for temp_path in temp_files.values():
            if os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except OSError:
                    pass  # Ignore cleanup errors
