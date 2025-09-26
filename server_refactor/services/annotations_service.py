from helpers import file as file_helper
from helpers import query_visitors as query_visitors_helper
from helpers import response as response_helper
from helpers import parameters as params_helper
from helpers import pysam as pysam_helper
from helpers import annotation as annotation_helper
from db.models import GenomeAnnotation, AnnotationError, AnnotationSequenceMap
from fastapi.responses import StreamingResponse, Response
from fastapi import HTTPException
from typing import Optional
import os

response_file_too_big_with_suggestions_example = {
  "error": "Requested package exceeds 10GB streaming limit.",
  "estimated_size_gb": 23.7,
  "annotation_count": 18753,
  "suggestions": [
    {
      "description": "Download only the most recent annotation per species",
      "example_filter": {
        "taxids": "40674", 
        "latest_per_species": True
      },
      "estimated_size_gb": 4.9,
      "annotation_count": 2465
    },
    {
      "description": "Split download by database source",
      "options": [
        {
          "source": "Ensembl",
          "annotation_count": 6200,
          "estimated_size_gb": 6.3
        },
        {
          "source": "NCBI",
          "annotation_count": 7800,
          "estimated_size_gb": 8.9
        },
        {
          "source": "UCSC",
          "annotation_count": 2753,
          "estimated_size_gb": 3.1
        }
      ]
    }
  ]
}

BASE_PATH = os.getenv('BASE_PATH', '')
API_URL = os.getenv('API_URL', '')

ANNOTATIONS_PATH= os.getenv('LOCAL_ANNOTATIONS_DIR')

def get_annotations(
    filter:str = None,
    taxids: Optional[str] = None, 
    db_sources: Optional[str] = None,
    feature_sources: Optional[str] = None,
    assembly_accessions: Optional[str] = None, 
    md5_checksums: Optional[str] = None, 
    offset: int = 0, limit: int = 20, 
    response_type: str = 'metadata', #metadata, download_info, download_file
    latest_release_by: str = None, #organism, assembly, taxon / None for no grouping
):
    try:
        if latest_release_by and latest_release_by not in ['organism', 'assembly', 'taxon']:
            raise HTTPException(status_code=400, detail=f"Invalid latest_release_by: {latest_release_by}, valid values are: organism, assembly, taxon")
        
        mongoengine_query = annotation_helper.query_params_to_mongoengine_query(
            taxids=taxids,
            db_sources=db_sources,
            assembly_accessions=assembly_accessions,
            md5_checksums=md5_checksums,
            feature_sources=feature_sources,
        )
        annotations = GenomeAnnotation.objects(**mongoengine_query)
        
        if filter:
            annotations = annotations.filter(query_visitors_helper.annotation_query(filter))

        if latest_release_by:
            annotations = annotations.aggregate(
                *annotation_helper.get_latest_release_by_group_pipeline(latest_release_by)
                )

        total = annotations.count()

        offset, limit = params_helper.handle_pagination_params(offset, limit, total)

        if response_type == 'download_info':
            return response_helper.download_summary_response(annotations, total)
        elif response_type == 'download_file':
            return response_helper.download_file_response(annotations)
        else:
            return response_helper.json_response_with_pagination(annotations, total, offset, limit)

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching annotations: {e}")

def get_annotation(md5_checksum):
    annotation = GenomeAnnotation.objects(md5_checksum=md5_checksum).exclude('id').first()
    if not annotation:
        raise HTTPException(status_code=404, detail=f"Annotation {md5_checksum} not found")
    return annotation

def get_mapped_regions(md5_checksum, offset_param, limit_param):
    try:
        regions = AnnotationSequenceMap.objects(md5_checksum=md5_checksum)
        count = regions.count()
        offset, limit = params_helper.handle_pagination_params(offset_param, limit_param, count)    
        return response_helper.json_response_with_pagination(regions, count, offset, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching mapped regions: {e}")

def get_contigs(md5_checksum):
    try:
        annotation = get_annotation(md5_checksum)
        file_path = file_helper.get_annotation_file_path(annotation)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Annotation {md5_checksum} not found")
        return StreamingResponse(
            pysam_helper.stream_contigs(file_path), 
            media_type='text/plain', 
            headers={
                "Content-Disposition": f'attachment; filename="{md5_checksum}_contigs.txt"',
                "Cache-Control": "public, max-age=86400",
                "X-Accel-Buffering": "no",
            }
        )  
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contigs: {e}")

def stream_annotation_tabix(md5_checksum, region, start, end):
    try:
        annotation = get_annotation(md5_checksum)
        file_path = file_helper.get_annotation_file_path(annotation)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Annotation file not found at {file_path}")
        
        if not region:
            raise HTTPException(status_code=400, detail="Region parameter is required")

        start = params_helper.coerce_optional_int(start, 'start')
        end = params_helper.coerce_optional_int(end, 'end')
        
        if start is not None and end is not None and start > end:
            raise HTTPException(status_code=400, detail="start must be less than end")

        gff_region = AnnotationSequenceMap.objects(md5_checksum=md5_checksum, aliases__in=[region]).first().sequence_id
        if not gff_region:
            raise HTTPException(status_code=404, detail=f"Region '{region}' not found in annotation {md5_checksum}")
        
        return StreamingResponse(pysam_helper.stream_gff_file_region(file_path, gff_region, start, end), media_type='text/plain')
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error processing annotation {md5_checksum}: {e}")

def download_annotation(md5_checksum):
    annotation = get_annotation(md5_checksum)
    file_path = file_helper.get_annotation_file_path(annotation)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Annotation {md5_checksum} not found")
    
    headers = {
        "X-Accel-Redirect": f"/_protected_files/{file_path}",
        "Content-Disposition": f'attachment; filename="{os.path.basename(file_path)}"',
        "Cache-Control": "public, max-age=86400",
        "X-Accel-Buffering": "no",
    }
    return Response(status_code=200, headers=headers)   

def get_annotation_errors(offset_param=0, limit_param=20):
    try:
        errors = AnnotationError.objects()
        count = errors.count()
        offset, limit = params_helper.handle_pagination_params(offset_param, limit_param, count)
        return response_helper.json_response_with_pagination(errors, count, offset, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching annotation errors: {e}")
