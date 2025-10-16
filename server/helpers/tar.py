import tarfile
from io import BytesIO
from typing import List
from fastapi import HTTPException
import os
import json
from datetime import datetime


def tar_stream(files: List[str], dict_metadata: dict = None):
    """
    Generator that yields tarball content chunk by chunk.
    """
    try:
        # Use a pipe-like object
        fileobj = BytesIO()
        with tarfile.open(mode="w", fileobj=fileobj) as tar:
            for path in files:
                tar.add(path, arcname=os.path.basename(path))
            if dict_metadata:
                # Custom JSON serializer to handle datetime objects
                def json_serializer(obj):
                    if isinstance(obj, datetime):
                        return obj.isoformat()
                    raise TypeError(f"Type {type(obj)} not serializable")
                
                # Create metadata JSON as bytes
                metadata_json = json.dumps(dict_metadata, default=json_serializer).encode()
                metadata_io = BytesIO(metadata_json)
                
                # Create a TarInfo object for the metadata file
                tarinfo = tarfile.TarInfo(name="metadata.json")
                tarinfo.size = len(metadata_json)
                
                # Add the metadata file to the tar
                tar.addfile(tarinfo, metadata_io)
                
            fileobj.seek(0)  # reset pointer
            yield from iter(lambda: fileobj.read(8192), b"")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating tar stream: {e}")