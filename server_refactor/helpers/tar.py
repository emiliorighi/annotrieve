import tarfile
from io import BytesIO
from typing import List
from pathlib import Path
from fastapi import HTTPException

def tar_stream(files: List[Path]):
    """
    Generator that yields tarball content chunk by chunk.
    """
    try:
    # Use a pipe-like object
        fileobj = BytesIO()
        with tarfile.open(mode="w", fileobj=fileobj) as tar:
            for path in files:
                tar.add(path, arcname=path.name)
            fileobj.seek(0)  # reset pointer
            yield from iter(lambda: fileobj.read(8192), b"")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating tar stream: {e}")