from db.models import GenomeAnnotation, GenomicRegion, AnnotationError, InconsistentFeature
from helpers import file as file_helper, genome_annotation as genome_annotation_helper, query_visitors as query_visitors, response as response_helper, mappers as mappers
from werkzeug.exceptions import NotFound, BadRequest
import pysam
from flask import send_from_directory, Response, stream_with_context
import os

ANNOTATIONS_PATH= os.getenv('LOCAL_ANNOTATIONS_DIR')

def get_annotations(filter=None, assembly_accessions=None, 
                    taxids=None, names=None, offset=0,
                    sources=None, limit=20, format='json', 
                    sort_order='asc', sort_by=None):

    annotations = genome_annotation_helper.get_annotations_from_db({
        'filter': filter,
        'assembly_accessions': assembly_accessions,
        'taxids': taxids,
        'names': names,
        'sources': sources,
        'sort_by': sort_by,
        'sort_order': sort_order
    })
    if format.lower() == 'tsv':
        annotation_mapper = mappers.get_model_mapper('annotations')
        return response_helper.format_tsv_response(annotations, annotation_mapper)
    elif format.lower() == 'jsonl':
        return response_helper.format_jsonl_response(annotations, offset, limit)
    else:
        count = annotations.count()
        return response_helper.format_json_response(annotations, count, offset, limit)

def get_annotation(name):
    ann_obj = GenomeAnnotation.objects(name=name).first()
    if not ann_obj:
        raise NotFound(description=f"Annotation {name} not found")
    return ann_obj

def get_annotation_gff(name, region=None, start=0, end=None, download=False):
    ann = genome_annotation_helper.get_annotation(name)
    file_path = file_helper.get_annotation_file_path(ann)
    if download and download.lower() == 'true':
        return download_annotation(ann, file_path)
    else:
        return get_annotation_gff_stream_no_download(ann, file_path, region, start, end)

def get_annotation_gff_stream_no_download(ann, file_path, region=None, start=0, end=None):
    # get region alias if region is not a gff region
    try:
        if end and type(end) == str:
            end = int(end)
        if start and type(start) == str:
            start = int(start)
        file = pysam.TabixFile(file_path)
        contigs = file.contigs
        if region:
            #get region by name or insdc accession
            region_obj = GenomicRegion.objects(query_visitors.gff_region_query(region, ann.assembly_accession)).first()
            if not region_obj:
                raise NotFound(description=f"Region {region} not found in annotation {ann.name}")
            gff_region = region_obj.name if region_obj.name in contigs else region_obj.insdc_accession
            return Response(stream_with_context(file.fetch(gff_region, start, end)), mimetype='text/plain', status=200)
        else:
            return Response(stream_with_context(file.fetch()), mimetype='text/plain', status=200)
    except ValueError as e:
        raise BadRequest(description=f"Error fetching annotation {ann.name}: {e}")
    except Exception as e:
        raise BadRequest(description=f"Error fetching annotation {ann.name}: {e}")

def download_annotation(ann, file_path):
    if not os.path.exists(file_path):
        raise NotFound(description=f"Annotation {ann.name} not found")
    bgzipped_path = ann.bgzipped_path.lstrip('/') if ann.bgzipped_path.startswith('/') else ann.bgzipped_path
    mime_type = 'binary/octet-stream'
    return send_from_directory(ANNOTATIONS_PATH, bgzipped_path, mimetype=mime_type)

def get_annotation_inconsistent_features(name):
    genome_annotation_helper.get_annotation(name)
    inconsistent_features = InconsistentFeature.objects(annotation_name=name).as_pymongo()
    return response_helper.dump_json(inconsistent_features)

def get_annotation_regions(name):
    ann = genome_annotation_helper.get_annotation(name)
    file_path = file_helper.get_annotation_file_path(ann)
    try:
        file = pysam.TabixFile(file_path)
        reference_names = file.contigs
        existing_regions = GenomicRegion.objects(assembly_accession=ann.assembly_accession)
        #map ref names to regions
        mapped_regions = []
        for existing_region in existing_regions:
            mapped_region = {
                'role': existing_region.role,
                'length': existing_region.length,
                'gc_percentage': existing_region.gc_percentage,
                'gc_count': existing_region.gc_count,
            }
            if existing_region.name in reference_names:
                mapped_region['gff_region'] = existing_region.name
                mapped_region['region_alias'] = existing_region.insdc_accession
            elif existing_region.insdc_accession in reference_names:
                mapped_region['gff_region'] = existing_region.insdc_accession
                mapped_region['region_alias'] = existing_region.name
            mapped_regions.append(mapped_region)
        return response_helper.dump_json(mapped_regions)
    except ValueError:
        raise NotFound(description=f"Annotation {name} not found")
    except Exception as e:
        raise BadRequest(description=f"Error fetching annotation {name}: {e}")

def get_annotation_errors(offset=0, limit=20):
    errors = AnnotationError.objects().skip(offset).limit(limit).as_pymongo()
    return response_helper.dump_json(errors)