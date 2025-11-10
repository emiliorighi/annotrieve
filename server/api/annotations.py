from fastapi import APIRouter, Depends, Body, HTTPException, Response
from typing import Optional, Dict, Any
from services import annotations_service
from helpers import parameters as params_helper
import inspect
from helpers import query_visitors as query_visitors_helper
from jobs.import_annotations import import_annotations
router = APIRouter()

@router.get("/annotations/import/{auth_key}")
async def trigger_import_annotations(auth_key: str):
    """
    Import annotations
    """
    return annotations_service.trigger_import_annotations(auth_key)

@router.get("/annotations/fields/update/{auth_key}")
async def trigger_annotation_fields_update(auth_key: str):
    """
    Trigger annotation fields update
    """
    return annotations_service.trigger_annotation_fields_update(auth_key)

@router.get("/annotations")
@router.post("/annotations")
async def get_annotations(commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Get annotations metadata
    """
    params = params_helper.handle_request_params(commons, payload)
    
    return annotations_service.get_annotations(params)


@router.get("/annotations/stats/summary")
@router.post("/annotations/stats/summary")
async def get_annotations_stats_summary(response: Response, commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Get annotations stats summary across all annotations in the queryset
    """
    params = params_helper.handle_request_params(commons, payload)
    
    # Add cache control headers (nginx will respect these)
    response.headers["Cache-Control"] = "public, max-age=600"  # 10 minutes
    response.headers["Vary"] = "Accept-Encoding"
    
    return annotations_service.get_annotations(params, response_type='summary_stats')

@router.get("/annotations/frequencies")
async def get_frequency_fields():
    """
    Get allowed fields for frequencies endpoint
    """
    return {"fields": list(query_visitors_helper.ALLOWED_FIELDS_MAP.keys())}

@router.get("/annotations/frequencies/{field}")
@router.post("/annotations/frequencies/{field}")
async def get_annotations_frequencies(field: str, commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Get annotations frequencies for a given field
    """
    params = params_helper.handle_request_params(commons, payload)
    
    return annotations_service.get_annotations(params, response_type='frequencies', field=field)


# @router.get("/annotations/download")
# @router.post("/annotations/download")
# async def get_annotations_download_file(response: Response, commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
#     """
#     Get annotations download file (response_type='download_file')
#     """
#     params = params_helper.handle_request_params(commons, payload)
#         # Get valid parameters from the service function signature
#     valid_params = set(inspect.signature(annotations_service.get_annotations).parameters.keys())
    
#     # Filter out invalid parameters
#     invalid_params = set(params.keys()) - valid_params
#     if invalid_params:
#         raise HTTPException(
#             status_code=400, 
#             detail=f"Invalid parameter(s): {', '.join(invalid_params)}"
#         )
    
#     # Add cache control headers (nginx will respect these)
#     response.headers["Cache-Control"] = "public, max-age=600"  # 10 minutes
#     response.headers["Vary"] = "Accept-Encoding"
    
#     return annotations_service.get_annotations(response_type='download_file', **params)

# @router.get("/annotations/download/summary")
# @router.post("/annotations/download/summary")
# async def get_annotations_download_info(response: Response, commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
#     """
#     Get annotations download info/summary (response_type='download_info')
#     """
#     params = params_helper.handle_request_params(commons, payload)
#         # Get valid parameters from the service function signature
#     valid_params = set(inspect.signature(annotations_service.get_annotations).parameters.keys())
    
#     # Filter out invalid parameters
#     invalid_params = set(params.keys()) - valid_params
#     if invalid_params:
#         raise HTTPException(
#             status_code=400, 
#             detail=f"Invalid parameter(s): {', '.join(invalid_params)}"
#         )
    
#     # Add cache control headers (nginx will respect these)
#     response.headers["Cache-Control"] = "public, max-age=600"  # 10 minutes
#     response.headers["Vary"] = "Accept-Encoding"
#     return annotations_service.get_annotations(response_type='download_info', **params)


@router.get("/annotations/errors")
async def get_annotation_errors(offset: int = 0, limit: int = 20):
    """
    Get annotation errors
    """
    return annotations_service.get_annotation_errors(offset, limit)

@router.get("/annotations/{md5_checksum}")
async def get_annotation(md5_checksum: str):
    """
    Get annotation metadata
    """
    annotation = annotations_service.get_annotation(md5_checksum)
    return annotation.to_mongo().to_dict()

@router.post("/annotations/{md5_checksum}/stats")
async def update_annotation_stats(md5_checksum: str, payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Update annotation stats, endpoint used from github action to update the stats of the annotations
    """
    annotations_service.update_annotation_stats(md5_checksum, payload)
    return {"message": "Annotation stats updated"}

@router.get("/annotations/{md5_checksum}/gff")
async def stream_annotation_gff(md5_checksum: str, commons: Dict[str, Any] = Depends(params_helper.common_params)):
    """
    Get GFF of an annotation file
    """
    return annotations_service.stream_annotation_tabix(md5_checksum, **commons)

@router.get("/annotations/{md5_checksum}/contigs")
async def get_contigs(md5_checksum: str):
    """
    Get contigs of an annotation file, as in pysam.contigs(). Returns a stream of contigs
    """
    return annotations_service.get_contigs(md5_checksum)

@router.get("/annotations/{md5_checksum}/contigs/aliases")
async def get_mapped_regions(md5_checksum: str, offset: int = 0, limit: int = 20):
    """
    Get mapped (assembled-molecules in INSDC) regions of an annotation file, seqid to sequence alias
    """
    return annotations_service.get_mapped_regions(md5_checksum, offset, limit)
