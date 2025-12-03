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





@router.get("/annotations/errors")
async def get_annotation_errors(offset: int = 0, limit: int = 20):
    """
    Get annotation errors
    """
    return annotations_service.get_annotation_errors(offset, limit)

@router.get("/annotations/gene-stats")
@router.post("/annotations/gene-stats")
async def get_gene_stats(commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Get gene stats summary with aggregated statistics across all categories.
    
    Returns:
    - total_annotations: Total number of annotations in queryset
    - summary.genes: Aggregated stats for each category (coding, non_coding, pseudogene)
    - categories: List of available gene categories
    - metrics: List of available metrics
    """
    return annotations_service.get_gene_stats_summary(commons, payload)

@router.get("/annotations/gene-stats/{category}")
@router.post("/annotations/gene-stats/{category}")
async def get_gene_category_details(category: str, commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Get detailed statistics for a specific gene category.
    
    Returns:
    - category: The gene category name
    - annotations_count: Number of annotations with this category
    - missing_annotations_count: Number of annotations missing this category
    - summary: Aggregated statistics (mean, median) for all metrics
    - metrics: List of metrics available for this category
    """
    return annotations_service.get_gene_category_details(category, commons, payload)

@router.get("/annotations/gene-stats/{category}/{metric}")
@router.post("/annotations/gene-stats/{category}/{metric}")
async def get_gene_category_metric_values(category: str, metric: str, commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Get raw values for a specific metric in a specific gene category (for plotting histograms).
    
    Parameters:
    - include_annotations: If True, include annotation_ids list (default: False). Can be passed as query param or in payload.
    
    Returns:
    - category: The gene category name
    - metric: The metric name
    - values: List of values (ordered by annotation_id)
    - annotation_ids: List of annotation_ids (only if include_annotations=True, ordered to match values)
    - missing: List of annotation_ids missing this metric
    """
    # Extract include_annotations from payload (preferred) or query params
    include_annotations = False
    if payload and 'include_annotations' in payload:
        include_annotations = payload.pop('include_annotations')
        include_annotations = params_helper.format_boolean_param(include_annotations)
    elif commons and 'include_annotations' in commons:
        include_annotations = commons.pop('include_annotations')
        include_annotations = params_helper.format_boolean_param(include_annotations)
    
    return annotations_service.get_gene_category_metric_values(category, metric, include_annotations, commons, payload)

@router.get("/annotations/transcript-stats")
@router.post("/annotations/transcript-stats")
async def get_transcript_stats(commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Get transcript stats summary with aggregated statistics across all types.
    
    Returns:
    - total_annotations: Total number of annotations in queryset
    - summary.types: Aggregated stats for each transcript type
    - types: List of available transcript types
    - metrics: List of available metrics
    """
    return annotations_service.get_transcript_stats_summary(commons, payload)

@router.get("/annotations/transcript-stats/{type}")
@router.post("/annotations/transcript-stats/{type}")
async def get_transcript_type_details(type: str, commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Get detailed statistics for a specific transcript type.
    
    Returns:
    - type: The transcript type name
    - annotations_count: Number of annotations with this type
    - missing_annotations_count: Number of annotations missing this type
    - summary: Aggregated statistics (mean, median) for all metrics
    - metrics: List of metrics available for this type
    """
    return annotations_service.get_transcript_type_details(type, commons, payload)

@router.get("/annotations/transcript-stats/{type}/{metric}")
@router.post("/annotations/transcript-stats/{type}/{metric}")
async def get_transcript_type_metric_values(type: str, metric: str, commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
    """
    Get raw values for a specific metric in a specific transcript type (for plotting histograms).
    
    Parameters:
    - include_annotations: If True, include annotation_ids list (default: False). Can be passed as query param or in payload.
    
    Returns:
    - type: The transcript type name
    - metric: The metric name
    - values: List of values (ordered by annotation_id)
    - annotation_ids: List of annotation_ids (only if include_annotations=True, ordered to match values)
    - missing: List of annotation_ids missing this metric
    """
    # Extract include_annotations from payload (preferred) or query params
    include_annotations = False
    if payload and 'include_annotations' in payload:
        #pop payload['include_annotations']
        include_annotations = payload.pop('include_annotations')
        include_annotations = params_helper.format_boolean_param(include_annotations)
    elif commons and 'include_annotations' in commons:
        include_annotations = commons.pop('include_annotations')
        include_annotations = params_helper.format_boolean_param(include_annotations)
    
    return annotations_service.get_transcript_type_metric_values(type, metric, include_annotations, commons, payload)


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

