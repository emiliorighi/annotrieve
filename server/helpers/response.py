from fastapi.responses import StreamingResponse
from helpers import file as file_helper, tar as tar_helper
from fastapi import HTTPException

def json_response_with_pagination(items, count, offset, limit):
    """Format response as JSON with pagination."""
    paginated_items = items.skip(offset).limit(limit).exclude('id').as_pymongo()
    return {
        'total': count,
        'offset': offset,
        'limit': limit,
        'results': list(paginated_items)
    }

def download_summary_response(items, count):
    #todo: add more details
    return {
        'estimated_size_mb': items.sum('file_size_mb'),
        'file_count': count,
        'file_format': 'tar',
    }

def download_file_response(items, threshold_gb: int = 15):
    total_size_gb = sum(items.sum('file_size_mb')) / 1024
    if total_size_gb > threshold_gb:
        raise HTTPException(status_code=400, detail="Dataset is too large to download, limit is 15gb. Refine your query to download a smaller dataset.")
    paths = [file_helper.get_annotation_file_path(annotation.bgzipped_path) for annotation in items]
    return StreamingResponse(tar_helper.tar_stream(paths), media_type='application/tar')