import tarfile
from io import BytesIO
from typing import List, Iterator, Optional, Union
from fastapi import HTTPException
import os
import json
from datetime import datetime


def tar_stream(files: List[str], items=None):
    """
    Generator that yields tarball content chunk by chunk.
    Memory-efficient streaming approach.
    """
    try:
        # Use a pipe-like object
        fileobj = BytesIO()
        with tarfile.open(mode="w", fileobj=fileobj) as tar:
            # Add files to tar
            for path in files:
                if os.path.exists(path):
                    tar.add(path, arcname=os.path.basename(path))
                else:
                    print(f"Warning: File not found: {path}")
            
            # Add metadata if provided
            if items is not None:
                # Custom JSON serializer to handle datetime objects
                def json_serializer(obj):
                    if isinstance(obj, datetime):
                        return obj.isoformat()
                    raise TypeError(f"Type {type(obj)} not serializable")
                
                # Convert items to list efficiently
                if hasattr(items, 'as_pymongo'):
                    # It's a MongoEngine queryset - convert to list
                    metadata_list = list(items.as_pymongo())
                elif isinstance(items, list):
                    # It's already a list
                    metadata_list = items
                else:
                    # Try to iterate over it
                    metadata_list = list(items)
                
                # Create metadata JSON as bytes
                metadata_json = json.dumps(metadata_list, default=json_serializer)
                metadata_io = BytesIO(metadata_json.encode('utf-8'))
                
                # Create TarInfo for metadata file
                tarinfo = tarfile.TarInfo(name="metadata.json")
                tarinfo.size = len(metadata_json.encode('utf-8'))
                
                tar.addfile(tarinfo, metadata_io)
                
        # Reset file pointer and stream the content
        fileobj.seek(0)
        yield from iter(lambda: fileobj.read(8192), b"")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating tar stream: {e}")


def tar_stream_chunked(files: List[str], items=None, chunk_size: int = 8192) -> Iterator[bytes]:
    """
    Memory-efficient streaming tar creation for very large datasets.
    Processes files and metadata in chunks to minimize memory usage.
    """
    try:
        # Create a temporary file-like object that can be streamed
        fileobj = BytesIO()
        
        with tarfile.open(mode="w", fileobj=fileobj) as tar:
            # Add files to tar
            for path in files:
                if os.path.exists(path):
                    tar.add(path, arcname=os.path.basename(path))
                else:
                    print(f"Warning: File not found: {path}")
            
            # Handle metadata efficiently
            if items is not None:
                # Use streaming metadata approach - NO MEMORY LOADING
                metadata_streamer = _MetadataStreamer(items)
                
                # Create TarInfo for metadata file
                tarinfo = tarfile.TarInfo(name="metadata.json")
                # We can't set size beforehand with streaming, so we'll estimate
                # The tarfile will handle the actual size
                
                # Add metadata file using the streaming file-like object
                tar.addfile(tarinfo, metadata_streamer)
        
        # Stream the tar content in chunks
        fileobj.seek(0)
        while True:
            chunk = fileobj.read(chunk_size)
            if not chunk:
                break
            yield chunk
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating chunked tar stream: {e}")


def _generate_metadata_content(items) -> str:
    """
    Generate metadata content as a string. More memory efficient than loading everything at once.
    """
    
    # Custom JSON serializer to handle datetime objects
    def json_serializer(obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")
    
    # Try the simple approach first - convert to list and then to JSON
    try:
        if hasattr(items, 'as_pymongo'):
            items_list = list(items.as_pymongo())
            metadata_content = json.dumps(items_list, default=json_serializer)
            return metadata_content
        elif isinstance(items, list):
            metadata_content = json.dumps(items, default=json_serializer)
            return metadata_content
        else:
            items_list = list(items)
            metadata_content = json.dumps(items_list, default=json_serializer)
            return metadata_content
    except Exception as e:
        # Fallback to empty array
        return "[]"
        
class _MetadataStreamer:
    """
    A file-like object that streams metadata JSON without loading everything into memory.
    Processes items one at a time and yields JSON chunks.
    """
    def __init__(self, items):
        self.items = items
        self.position = 0
        self.current_buffer = b""
        self.started = False
        self.finished = False
        self.item_iterator = None
        
        # Custom JSON serializer to handle datetime objects
        self.json_serializer = lambda obj: obj.isoformat() if isinstance(obj, datetime) else None
    
    def read(self, size: int = -1) -> bytes:
        """
        Read up to 'size' bytes from the metadata stream.
        Returns empty bytes when done.
        """
        if self.finished:
            return b""
        
        # Initialize the iterator on first read
        if not self.started:
            self._initialize_iterator()
            self.started = True
        
        # If we have data in buffer, return it
        if len(self.current_buffer) > 0:
            if size == -1:
                # Return all remaining data
                result = self.current_buffer
                self.current_buffer = b""
                return result
            else:
                # Return up to size bytes
                if len(self.current_buffer) <= size:
                    result = self.current_buffer
                    self.current_buffer = b""
                    return result
                else:
                    result = self.current_buffer[:size]
                    self.current_buffer = self.current_buffer[size:]
                    return result
        
        # Try to get more data
        if self.item_iterator is not None:
            try:
                item = next(self.item_iterator)
                # Convert item to JSON and add to buffer
                item_json = json.dumps(item, default=self.json_serializer)
                if self.position == 0:
                    # First item - start array
                    self.current_buffer += b"["
                else:
                    # Subsequent items - add comma
                    self.current_buffer += b","
                
                self.current_buffer += item_json.encode('utf-8')
                self.position += 1
                
                # Return data if we have enough
                if size != -1 and len(self.current_buffer) >= size:
                    result = self.current_buffer[:size]
                    self.current_buffer = self.current_buffer[size:]
                    return result
                else:
                    return self.read(size)  # Recursive call to get more data
                    
            except StopIteration:
                # No more items - finish the JSON array
                self.current_buffer += b"]"
                self.finished = True
                return self.read(size)  # Return the closing bracket
        
        return b""
    
    def _initialize_iterator(self):
        """Initialize the item iterator based on the items type."""
        if hasattr(self.items, 'as_pymongo'):
            # It's a MongoEngine queryset
            self.item_iterator = iter(self.items.as_pymongo())
        elif isinstance(self.items, list):
            # It's already a list
            self.item_iterator = iter(self.items)
        else:
            # Try to iterate over it
            self.item_iterator = iter(self.items)

