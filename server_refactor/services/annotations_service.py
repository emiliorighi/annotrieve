from helpers import file as file_helper
from helpers import query_visitors as query_visitors_helper
from helpers import response as response_helper
from helpers import parameters as params_helper
from helpers import pysam_helper
from helpers import annotation as annotation_helper
from db.models import GenomeAnnotation, AnnotationError, AnnotationSequenceMap, drop_all_collections, TaxonNode
from fastapi.responses import StreamingResponse, Response
from fastapi import HTTPException
from typing import Optional
import os
from jobs.import_annotations import import_annotations
from mongoengine import QuerySet

NO_VALUE_KEY = "no_value"

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


def get_annotations(
    filter:str = None,
    taxids: Optional[str] = None, 
    db_sources: Optional[str] = None,
    feature_sources: Optional[str] = None,
    assembly_accessions: Optional[str] = None,
    biotypes: Optional[str] = None,
    feature_types: Optional[str] = None,
    md5_checksums: Optional[str] = None, 
    offset: int = 0, limit: int = 20, 
    response_type: str = 'metadata', #metadata, download_info, download_file
    latest_release_by: str = None, #organism, assembly, taxon / None for no grouping
    field: str = None, #field to get stats for
):
    try:
        # trigger import annotations asynchronously (fire-and-forget)
        #drop_all_collections()   
        import_annotations.delay()
        if latest_release_by and latest_release_by not in ['organism', 'assembly']:
            raise HTTPException(status_code=400, detail=f"Invalid latest_release_by: {latest_release_by}, valid values are: organism, assembly, taxon")
        
        mongoengine_query = annotation_helper.query_params_to_mongoengine_query(
            taxids=taxids,
            db_sources=db_sources,
            assembly_accessions=assembly_accessions,
            md5_checksums=md5_checksums,
            feature_sources=feature_sources,
            biotypes=biotypes,
            feature_types=feature_types,
        )
        annotations = GenomeAnnotation.objects(**mongoengine_query).exclude('id')
        
        if filter:
            annotations = annotations.filter(query_visitors_helper.annotation_query(filter))

        if latest_release_by:
            pymongo_query = annotations.aggregate(
                *annotation_helper.get_latest_release_by_group_pipeline(latest_release_by)
                )
            #query again to get the queryset object
            annotations = GenomeAnnotation.objects(_id__in=[doc['_id'] for doc in pymongo_query]).exclude('id')
        
        total = annotations.count()
        offset, limit = params_helper.handle_pagination_params(offset, limit, total)

        if response_type == 'download_info':
            return response_helper.download_summary_response(annotations, total)
        elif response_type == 'download_file':
            return response_helper.download_file_response(annotations)
        elif response_type == 'stats':
            return get_stats(annotations, field)
        else:
            return response_helper.json_response_with_pagination(annotations, total, offset, limit)

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching annotations: {e}")

def get_annotation(md5_checksum):
    annotation = GenomeAnnotation.objects(annotation_id=md5_checksum).exclude('id').first()
    if not annotation:
        raise HTTPException(status_code=404, detail=f"Annotation {md5_checksum} not found")
    return annotation

def get_mapped_regions(md5_checksum, offset_param, limit_param):
    try:
        regions = AnnotationSequenceMap.objects(annotation_id=md5_checksum)
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

def stream_annotation_tabix(md5_checksum, region, start, end, feature_type, feature_source):
    try:
        annotation = get_annotation(md5_checksum)
        file_path = file_helper.get_annotation_file_path(annotation)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Annotation file not found at {file_path}")
        
        start = params_helper.coerce_optional_int(start, 'start')
        end = params_helper.coerce_optional_int(end, 'end')
        
        if start is not None and end is not None and start > end:
            raise HTTPException(status_code=400, detail="start must be less than end")
        region_str = str(region)
        seq_id = None
        #resolve aliases to sequence_id
        gff_region = AnnotationSequenceMap.objects(annotation_id=md5_checksum, aliases__in=[region, region_str]).first()
        if not gff_region:
            #check if the region is present in the contigs
            for contig in pysam_helper.stream_contigs(file_path):
                if region == contig:
                    seq_id = region
                    break
            if not seq_id:
                raise HTTPException(status_code=404, detail=f"Region '{region}' not found in annotation {md5_checksum}")
        else:
            seq_id = gff_region.sequence_id
        if feature_type:
            return StreamingResponse(pysam_helper.stream_region_with_filters(file_path, seq_id, start, end, feature_type), media_type='text/plain')
        return StreamingResponse(pysam_helper.stream_gff_file_region(file_path, seq_id, start, end))
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

def get_stats(items:QuerySet, field:str):
    if not field:
        raise HTTPException(status_code=400, detail="Field parameter is required")
    
    try:
        pipeline = [
            {
                "$project": {
                    "field_value": {
                        "$ifNull": [f"${field}", f"{NO_VALUE_KEY}"]
                    }
                }
            },
            {"$unwind": "$field_value"},
            {
                "$group": {
                    "_id": "$field_value",
                    "count": {"$sum": 1}
                }
            },
        ]

        response = {
            str(doc["_id"]): int(doc["count"])
            for doc in items.aggregate(pipeline)
        }

        sorted_response = {key: value for key, value in sorted(response.items())}
        return sorted_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {e}")