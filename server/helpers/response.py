from fastapi.responses import StreamingResponse
from helpers import file as file_helper, tar as tar_helper
from fastapi import HTTPException
import json

def json_response_with_pagination(items, count, offset, limit):
    """Format response as JSON with pagination."""
    #force offset and limit to be int
    try:
        offset = int(offset)
        limit = int(limit)
    except:
        offset = 0
        limit = 20
    paginated_items = items.skip(offset).limit(limit).exclude('id').as_pymongo()
    return {
        'total': count,
        'offset': offset,
        'limit': limit,
        'results': list(paginated_items)
    }

def get_gb_size(items):
    return round(items.sum('indexed_file_info.file_size') / 1024 / 1024 / 1024, 2)

def download_summary_response(items, count):
    #todo: add more details
    return {
        'estimated_size_gb': get_gb_size(items),
        'file_count': count,
        'file_format': 'tar',
    }

async def download_file_response(items, threshold_gb: int = 15, filename: str = 'annotations.tar', include_csi_index: bool = True, include_metadata: bool = True):
    total_size_gb = get_gb_size(items)
    if total_size_gb > threshold_gb:
        raise HTTPException(status_code=400, detail="Dataset is too large to download, limit is 15gb. Refine your query to download a smaller dataset.")
    
    paths = [file_helper.get_annotation_file_path(annotation) for annotation in items]
    if include_csi_index == 'true' or include_csi_index == True:
        paths.extend([f"{path}.csi" for path in paths])
    
    # Determine if we should include metadata
    should_include_metadata = include_metadata in [True, 'true', 'True', '1', 1]
    
    return StreamingResponse(
        tar_helper.tar_stream_chunked(paths, items if should_include_metadata else None), 
        media_type='application/x-tar', 
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )