from fastapi import APIRouter, Depends, Body, HTTPException, Response
from typing import Optional, Dict, Any
from services import annotations_service
from helpers import parameters as params_helper
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


@router.get("/annotations/report")
@router.post("/annotations/report")
async def get_annotations_report(commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Get annotations report
    """
    params = params_helper.handle_request_params(commons, payload)
    return annotations_service.get_annotations(params, response_type='tsv')


#TODO: uncomment this when we have the summary stats ready
# @router.get("/annotations/stats/summary")
# @router.post("/annotations/stats/summary")
# async def get_annotations_stats_summary(response: Response, commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
#     """
#     Get annotations stats summary across all annotations in the queryset
#     """
#     params = params_helper.handle_request_params(commons, payload)
    
#     # Add cache control headers (nginx will respect these)
#     response.headers["Cache-Control"] = "public, max-age=600"  # 10 minutes
#     response.headers["Vary"] = "Accept-Encoding"
    
#     return annotations_service.get_annotations(params, response_type='summary_stats')
# TODO: uncomment this when we have the distribution stats ready
# @router.get("/annotations/stats/distribution")
# @router.post("/annotations/stats/distribution")
# async def get_annotations_stats_distribution(
#     response: Response,
#     metric: str = 'all',
#     category: str = 'all',
#     commons: Dict[str, Any] = Depends(params_helper.common_params),
#     payload: Optional[Dict[str, Any]] = Body(None)
# ):
#     """
#     Get distribution data from annotations for box/violin plots.
    
#     Parameters:
#     - metric: One of 'counts', 'mean_lengths', 'ratios', or 'all' (default: 'all')
#     - category: One of 'coding_genes', 'non_coding_genes', 'pseudogenes', or 'all' (default: 'all')
#     - All standard annotation filter parameters are supported via commons/payload
    
#     Returns:
#     - counts: Dict mapping category names to lists of count values
#     - mean_lengths: Dict mapping category names to lists of mean length values
#     - ratios: Dict with 'coding_ratio', 'non_coding_ratio', 'pseudogene_ratio' lists
#     """
#     params = params_helper.handle_request_params(commons, payload)
    
#     # Extract metric and category from params if provided, then remove them
#     # since get_annotation_records() doesn't accept these parameters
#     if 'metric' in params:
#         metric = params.pop('metric')
#     if 'category' in params:
#         category = params.pop('category')
    
#     # Also check payload for metric and category (these won't be in params if in payload)
#     if payload:
#         if 'metric' in payload:
#             metric = payload.get('metric', metric)
#         if 'category' in payload:
#             category = payload.get('category', category)
    
#     # Add cache control headers
#     response.headers["Cache-Control"] = "public, max-age=600"  # 10 minutes
#     response.headers["Vary"] = "Accept-Encoding"
    
#     # Get annotation records with same filtering as other endpoints (excluding metric and category)
#     annotations = annotations_service.get_annotation_records(**params)
    
#     return annotations_service.get_annotations_distribution_data(annotations, metric=metric, category=category)

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
    return annotations_service.get_annotation_metadata(md5_checksum)

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
