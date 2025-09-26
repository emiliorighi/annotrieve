from fastapi import APIRouter, Depends, Body
from typing import Optional
from services import annotations_service
from helpers import parameters as params_helper

router = APIRouter()

@router.get("/annotations")
@router.post("/annotations")
async def get_annotations(commons: dict = Depends(), payload: dict | None = Body(None)):
    """
    Get annotations metadata
    """
    params = params_helper.handle_request_params(commons, payload)
    return annotations_service.get_annotations(**params)

@router.get("/annotations/download")
@router.post("/annotations/download")
async def get_annotations_download_summary(commons: dict = Depends(), payload: dict | None = Body(None)):
    """
    Get annotations download summary
    """
    params = params_helper.handle_request_params(commons, payload)
    return annotations_service.get_annotations(response_type='download_file', **params)

@router.get("/annotations/download/summary")
@router.post("/annotations/download/summary")
async def get_annotations_download_summary(commons: dict = Depends(), payload: dict | None = Body(None)):
    """
    Get annotations download summary
    """
    params = params_helper.handle_request_params(commons, payload)
    return annotations_service.get_annotations(response_type='download_info', **params)

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

@router.get("/annotations/{md5_checksum}/file")
async def download_annotation(md5_checksum: str):
    """
    Download/stream annotation file, should actually redirect to the nginx server
    """
    return annotations_service.download_annotation(md5_checksum)

@router.get("/annotations/{md5_checksum}/contigs")
async def get_contigs(md5_checksum: str):
    """
    Get contigs of an annotation file, as in pysam.contigs(). Returns a stream of contigs
    """
    return annotations_service.get_contigs(md5_checksum)

@router.get("/annotations/{md5_checksum}/contigs/features")
async def get_annotation_tabix(md5_checksum: str, region: Optional[str] = None, start: Optional[int] = None, end: Optional[int] = None):
    """
    Stream a region of an annotation file given a region and optionally a start and end
    """
    return annotations_service.stream_annotation_tabix(md5_checksum, region, start, end)

@router.get("/annotations/{md5_checksum}/contigs/assembled")
async def get_mapped_regions(md5_checksum: str, offset: int = 0, limit: int = 20):
    """
    Get mapped (assembled-molecules in INSDC) regions of an annotation file, seqid to sequence alias
    """
    return annotations_service.get_mapped_regions(md5_checksum, offset, limit)
