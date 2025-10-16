from fastapi.responses import StreamingResponse
from helpers import file as file_helper, tar as tar_helper
from fastapi import HTTPException

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

def download_summary_response(items, count):
    #todo: add more details
    return {
        'estimated_size_gb': round(items.sum('indexed_file_info.file_size')/1024/1024/1024, 2),
        'file_count': count,
        'file_format': 'tar',
    }

def download_file_response(items, threshold_gb: int = 15, filename: str = 'annotations.tar', include_csi_index: bool = True, include_metadata: bool = True):
    

    total_size_gb = round(items.sum('indexed_file_info.file_size') / 1024 / 1024 / 1024, 2)
    if total_size_gb > threshold_gb:
        raise HTTPException(status_code=400, detail="Dataset is too large to download, limit is 15gb. Refine your query to download a smaller dataset.")
    paths = [file_helper.get_annotation_file_path(annotation) for annotation in items]
    metadata = list(items.as_pymongo()) if include_metadata == 'true' or include_metadata == True else None
    if include_csi_index == 'true' or include_csi_index == True:
        paths.extend([f"{path}.csi" for path in paths])
    return StreamingResponse(tar_helper.tar_stream(paths, metadata), media_type='application/tar', headers={"Content-Disposition": f"attachment; filename={filename}"})