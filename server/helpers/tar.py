import tarfile
from io import BytesIO
from typing import List, Iterator, Optional, Union
from fastapi import HTTPException
import os
import json
import tempfile
import atexit
from datetime import datetime

def tar_stream_chunked(files: List[str], items=None, chunk_size: int = 8192) -> Iterator[bytes]:
    """
    Ultra memory-efficient streaming tar creation using temporary files.
    Writes metadata to temp file, creates tar in temp file, streams it, then cleans up.
    Uses a generator to start streaming immediately and avoid nginx timeouts.
    """
    temp_dir = None
    metadata_file_path = None
    temp_tar_path = None
    
    try:
        # Create temporary directory for our files
        temp_dir = tempfile.mkdtemp(prefix="annotrieve_tar_")
        
        # Create temporary tar file path
        temp_tar_path = os.path.join(temp_dir, "annotations.tar")
        
        # Create metadata file if needed (write to disk, no memory loading)
        if items is not None:
            metadata_file_path = os.path.join(temp_dir, "metadata.json")
            _write_metadata_to_file(items, metadata_file_path)
        
        # Create tar file with all files (write to disk)
        with tarfile.open(temp_tar_path, mode="w") as tar:
            # Add annotation files
            for path in files:
                if os.path.exists(path):
                    tar.add(path, arcname=os.path.basename(path))
                else:
                    print(f"Warning: File not found: {path}")
            
            # Add metadata file if it exists
            if metadata_file_path and os.path.exists(metadata_file_path):
                tar.add(metadata_file_path, arcname="metadata.json")
        
        # Stream the tar file in chunks from disk
        with open(temp_tar_path, 'rb') as tar_file:
            while True:
                chunk = tar_file.read(chunk_size)
                if not chunk:
                    break
                yield chunk
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating chunked tar stream: {e}")
    finally:
        # Clean up all temporary files after streaming completes
        try:
            if metadata_file_path and os.path.exists(metadata_file_path):
                os.unlink(metadata_file_path)
            if temp_tar_path and os.path.exists(temp_tar_path):
                os.unlink(temp_tar_path)
            if temp_dir and os.path.exists(temp_dir):
                import shutil
                shutil.rmtree(temp_dir)
        except Exception as e:
            print(f"Warning: Could not clean up temporary files: {e}")


def _write_metadata_to_file(items, file_path: str) -> None:
    """
    Write metadata to a temporary JSON file without loading everything into memory.
    """
    # Custom JSON serializer to handle datetime objects
    def json_serializer(obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('[')  # Start JSON array
        
        first = True
        if hasattr(items, 'as_pymongo'):
            # It's a MongoEngine queryset - iterate efficiently
            for item in items.as_pymongo():
                if not first:
                    f.write(',')
                f.write(json.dumps(item, default=json_serializer))
                first = False
        elif isinstance(items, list):
            # It's already a list
            for item in items:
                if not first:
                    f.write(',')
                f.write(json.dumps(item, default=json_serializer))
                first = False
        else:
            # Try to iterate over it
            for item in items:
                if not first:
                    f.write(',')
                f.write(json.dumps(item, default=json_serializer))
                first = False
        
        f.write(']')  # End JSON array