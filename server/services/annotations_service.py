from helpers import file as file_helper
from helpers import query_visitors as query_visitors_helper
from helpers import response as response_helper
from helpers import parameters as params_helper
from helpers import pysam_helper
from helpers import annotation as annotation_helper
from helpers import pipelines as pipelines_helper
from db.models import GenomeAnnotation, AnnotationError, AnnotationSequenceMap, drop_all_collections, TaxonNode, GenomeAssembly, Organism, GenomicSequence
from fastapi.responses import StreamingResponse, Response
from fastapi import HTTPException
from typing import Optional
import os
from jobs.import_annotations import import_annotations
import statistics


NO_VALUE_KEY = "no_value"

def get_annotations(
    filter:str = None, #text search on assembly, taxonomy or annotation id
    taxids: Optional[str] = None, 
    db_sources: Optional[str] = None, #GenBank, RefSeq, Ensembl
    feature_sources: Optional[str] = None, #second column in the gff file
    assembly_accessions: Optional[str] = None,
    biotypes: Optional[str] = None, #biotype present in the 9th column in the gff file
    feature_types: Optional[str] = None,# third column in the gff file
    has_stats: Optional[bool] = None, #True, False, None for all
    pipelines: Optional[str] = None, #pipeline name
    providers: Optional[str] = None, #annotation provider list separated by comma
    md5_checksums: Optional[str] = None, 
    offset: int = 0, limit: int = 20, 
    response_type: str = 'metadata', #metadata, download_info, download_file
    latest_release_by: str = None, #organism, assembly, taxon / None for no grouping
    field: str = None, #field to get frequencies or statistics
    sort_by: str = None,
    sort_order: str = None,
    filename: str = 'annotations.tar',
    release_date_from: str = None,
    release_date_to: str = None,
    fields: Optional[str] = None,
    include_csi_index: bool = True,
    include_metadata: bool = True,
):
    try:

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
            has_stats=has_stats,
            pipelines=pipelines,
            providers=providers,
            release_date_from=release_date_from,
            release_date_to=release_date_to,
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
        if sort_by:
            sort = '-' + sort_by if sort_order == 'desc' else sort_by
            annotations = annotations.order_by(sort)
        total = annotations.count()
        offset, limit = params_helper.handle_pagination_params(offset, limit, total)

        if response_type == 'download_info':
            return response_helper.download_summary_response(annotations, total)
        elif response_type == 'download_file':
            return response_helper.download_file_response(annotations, filename=filename, include_csi_index=include_csi_index, include_metadata=include_metadata)
        elif response_type == 'frequencies':
            return query_visitors_helper.get_frequencies(annotations, field, type='annotation')
        elif response_type == 'summary_stats':
            return get_annotations_summary_stats(annotations)
        else:
            if fields:
                annotations = annotations.only(*fields.split(','))
            return response_helper.json_response_with_pagination(annotations, total, offset, limit)

    except HTTPException as e:
        raise e
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Error fetching annotations: {e}")

def get_annotation(md5_checksum):
    annotation = GenomeAnnotation.objects(annotation_id=md5_checksum).first()
    if not annotation:
        raise HTTPException(status_code=404, detail=f"Annotation {md5_checksum} not found")
    return annotation


def get_annotations_summary_stats(annotations):
    """
    Calculate summary statistics across all annotations in the queryset.
    Returns aggregated stats for genes, transcripts, and features.
    """

    # Basic annotation counts
    total_count = annotations.count()
    related_organisms_count = len(annotations.distinct('taxid'))
    related_assemblies_count = len(annotations.distinct('assembly_accession'))
    
    # Helper function to calculate stats for a gene category
    def get_gene_category_stats(category_name):
        pipeline = pipelines_helper.category_stats_pipeline(category_name)
        
        result = list(annotations.aggregate(pipeline))
        if not result or not result[0]:
            return None
        
        data = result[0]
        counts = [c for c in data.get('counts', []) if c is not None]
        mean_lengths = [ml for ml in data.get('mean_lengths', []) if ml is not None]
        
        return annotation_helper.map_to_gene_category_stats(data, counts, mean_lengths)
    
    # Get stats for each gene category
    coding_genes_stats = get_gene_category_stats('coding_genes')
    non_coding_genes_stats = get_gene_category_stats('non_coding_genes')
    pseudogenes_stats = get_gene_category_stats('pseudogenes')
    
    # Helper function to aggregate transcript type stats (e.g., mRNA)
    def get_transcript_type_stats(gene_categories):
        """Aggregate transcript types across all gene categories"""
        transcript_stats = {}
        
        for category_stats in gene_categories:
            if not category_stats or not category_stats.get('transcript_types'):
                continue
            
            for types_dict in category_stats['transcript_types']:
                if not types_dict or not isinstance(types_dict, dict):
                    continue
                
                for type_name, type_data in types_dict.items():
                    if type_name not in transcript_stats:
                        transcript_stats[type_name] = {
                            'counts': [],
                            'mean_lengths': []
                        }
                    
                    if isinstance(type_data, dict):
                        count = type_data.get('count')
                        if count is not None:
                            transcript_stats[type_name]['counts'].append(count)
                        
                        length_stats = type_data.get('length_stats', {})
                        if isinstance(length_stats, dict):
                            mean_length = length_stats.get('mean')
                            if mean_length is not None:
                                transcript_stats[type_name]['mean_lengths'].append(mean_length)
        
        # Calculate final stats for each transcript type
        result = {}
        for type_name, data in transcript_stats.items():
            counts = data['counts']
            mean_lengths = data['mean_lengths']
            
            # Build the proper data dictionary with calculated stats
            stats_data = {
                'total_count': sum(counts) if counts else 0,
                'avg_count': statistics.mean(counts) if counts else 0,
                'avg_mean_length': statistics.mean(mean_lengths) if mean_lengths else 0
            }
            
            result[type_name] = annotation_helper.map_to_transcript_type_stats(stats_data, counts, mean_lengths)
        
        return result
    
    # Get transcript stats
    transcript_stats = get_transcript_type_stats([
        coding_genes_stats,
        non_coding_genes_stats,
        pseudogenes_stats
    ])
    
    # Helper function to get feature stats (cds, exons, introns)
    def get_feature_stats(gene_category, feature_name):
        """Get stats for a specific feature type within a gene category"""
        
        pipeline = pipelines_helper.feature_stats_pipeline(gene_category, feature_name)        
        result = list(annotations.aggregate(pipeline))
        if not result or not result[0]:
            return None
        
        data = result[0]
        mean_lengths = [ml for ml in data.get('mean_lengths', []) if ml is not None]
        
        return {
            'mean_length': round(data.get('avg_mean_length', 0), 2) if data.get('avg_mean_length') else 0,
            'median_length': round(statistics.median(mean_lengths), 2) if mean_lengths else 0
        }
    
    # Aggregate feature stats across all gene categories
    feature_types = ['cds', 'exons', 'introns']
    gene_categories = ['coding_genes', 'non_coding_genes', 'pseudogenes']
    
    features_stats = {}
    for feature_name in feature_types:
        all_mean_lengths = []
        
        for gene_category in gene_categories:
            feature_stat = get_feature_stats(gene_category, feature_name)
            if feature_stat and feature_stat.get('mean_length'):
                all_mean_lengths.append(feature_stat['mean_length'])
        
        features_stats[feature_name] = {
            'mean_length': round(statistics.mean(all_mean_lengths), 2) if all_mean_lengths else 0,
            'median_length': round(statistics.median(all_mean_lengths), 2) if all_mean_lengths else 0
        }
    
    # Build final summary report
    summary_report = {
        'annotations': {
            'total_count': total_count,
            'related_organisms_count': related_organisms_count,
            'related_assemblies_count': related_assemblies_count,
        },
        'genes': {}
    }
    
    # Add gene stats
    if coding_genes_stats:
        summary_report['genes']['coding_genes'] = annotation_helper.category_stats_to_dict(coding_genes_stats)
    
    if non_coding_genes_stats:
        summary_report['genes']['non_coding_genes'] = annotation_helper.category_stats_to_dict(non_coding_genes_stats)
    
    if pseudogenes_stats:
        summary_report['genes']['pseudogenes'] = annotation_helper.category_stats_to_dict(pseudogenes_stats)
    
    # Add transcript stats
    if transcript_stats:
        summary_report['transcripts'] = transcript_stats
    
    # Add feature stats
    if features_stats:
        summary_report['features'] = features_stats
    
    return summary_report

def update_annotation_stats(md5_checksum, payload):
    print(f"DEBUG: Received payload: {payload}")
    if not payload:
        raise HTTPException(status_code=400, detail="No payload provided")
    auth_key = payload.get('auth_key')
    if auth_key != os.getenv('AUTH_KEY'):
        raise HTTPException(status_code=401, detail="Unauthorized")
    annotation = get_annotation(md5_checksum)
    annotation.features_statistics = annotation_helper.map_to_gff_stats(payload.get('features_statistics'))
    annotation.save()

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

def stream_annotation_tabix(md5_checksum:str, region:str=None, start:int=None, end:int=None, feature_type:str=None, feature_source:str=None, biotype:str=None):
    try:
        annotation = get_annotation(md5_checksum)
        file_path = file_helper.get_annotation_file_path(annotation)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"Annotation file not found at {file_path}")
        
        start = params_helper.coerce_optional_int(start, 'start')
        end = params_helper.coerce_optional_int(end, 'end')
        
        #if there is no filter raise an error suggesting to download the file instead
        if not feature_type and not feature_source and not biotype and not region:
            raise HTTPException(status_code=400, detail="No filters provided, please provide a region, feature type, feature source or biotype to filter the annotation file, or download the file instead.")

        if start is not None and end is not None and start > end:
            raise HTTPException(status_code=400, detail="start must be less than end")
        
        seq_id = annotation_helper.resolve_sequence_id(region, md5_checksum, file_path) if region else None

        #check if biotype, feature_type and feature_source are valid values
        if biotype and biotype not in annotation.features_summary.biotypes:
            raise HTTPException(status_code=400, detail=f"Invalid biotype: {biotype}, expected values are: {annotation.features_summary.biotypes}")
        if feature_type and feature_type not in annotation.features_summary.types:
            raise HTTPException(status_code=400, detail=f"Invalid feature type: {feature_type}, expected values are: {annotation.features_summary.types}")
        if feature_source and feature_source not in annotation.features_summary.sources:
            raise HTTPException(status_code=400, detail=f"Invalid feature source: {feature_source}, expected values are: {annotation.features_summary.sources}")
        return StreamingResponse(pysam_helper.stream_gff_file(file_path, index_format='csi', seqid=seq_id, start=start, end=end, feature_type=feature_type, feature_source=feature_source, biotype=biotype), media_type='text/plain')
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

def trigger_import_annotations(auth_key: str):
    if auth_key != os.getenv('AUTH_KEY'):
        raise HTTPException(status_code=401, detail="Unauthorized")
    import_annotations.delay()
    return {"message": "Import annotations task triggered"}


def drop_collections(auth_key: str, model: str):
    if auth_key != os.getenv('AUTH_KEY'):
        raise HTTPException(status_code=401, detail="Unauthorized")
    if model == 'all':
        drop_all_collections()
    elif model == 'annotations':
        GenomeAnnotation.objects().delete()
        AnnotationSequenceMap.objects().delete()
        AnnotationError.objects().delete()
    elif model == 'taxonomy':
        TaxonNode.objects().delete()
        Organism.objects().delete()
    elif model == 'genomes':
        GenomeAssembly.objects().delete()
        GenomicSequence.objects().delete()
    return {"message": "Collections dropped"}