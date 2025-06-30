from .annotation import annotations_controller
from .taxon import taxons_controller
from .stats import stats_controller
from .genomic_region import genomic_regions_controller
from .feature_type import  feature_types_controller
from .download import download_controller
from .stream import stream_controller
import os


def initialize_routes(api):
    
    # API version prefix - can be set via environment variable
    API_VERSION = os.getenv('API_VERSION', '/v1')
    
    # If API_VERSION doesn't start with '/', add it
    if not API_VERSION.startswith('/'):
        API_VERSION = f'/{API_VERSION}'
    
    annotations_routes = [
        (annotations_controller.AnnotationsApi, '/annotations'), # list all annotations
        (annotations_controller.AnnotationLogsApi, '/annotations/logs'), # list annotation logs
        (annotations_controller.AnnotationQueryApi, '/annotations/search'), # post query annotations
    ]

    annotation_download_routes = [
        (download_controller.AnnotationsDownloadApi, '/annotations/download'), # download all annotations
        (download_controller.AnnotationDownloadPreviewApi, '/annotations/download/preview'), # preview a specific annotation
        (download_controller.AnnotationsDownloadBulkApi, '/annotations/download/bulk'), # bulk download annotations
    ]

    tasks_routes = [
        (download_controller.AnnotationsDownloadBulkStatusApi, '/download-tasks/<task_id>'), # get a specific download task status
        (download_controller.AnnotationsDownloadBulkFileApi, '/download-tasks/<task_id>/download'), # download a specific task
    ]

    annotation_routes = [
        (annotations_controller.AnnotationApi, '/annotations/<annotation_name>'), # get a specific annotation
        (annotations_controller.AnnotationRegionsApi, '/annotations/<annotation_name>/regions'), # get the regions of an annotation
        
        (feature_types_controller.FeatureTypeStatsAnnotationRegionApi, '/annotations/<annotation_name>/feature-types', '/annotations/<annotation_name>/regions/<region_name>/feature-types'), # get the feature type stats for an annotation
        (feature_types_controller.FeatureTypeStatsAnnotationHierarchyApi, '/annotations/<annotation_name>/feature-types/tree', '/annotations/<annotation_name>/regions/<region_name>/feature-types/tree'), # get the hierarchy stats for an annotation and a specific region
        (download_controller.AnnotationDownloadApi, '/annotations/<annotation_name>/download'), # download a specific annotation
    ]

    file_stream_routes = [
        (stream_controller.AnnotationRegionsAliasesTabixApi, '/annotations/<annotation_name>/regions/aliases'), # get the region aliases of an annotation
        (stream_controller.AnnotationRegionTabixStreamApi, '/annotations/<annotation_name>/regions/stream', '/annotations/<annotation_name>/regions/<region_name>/stream'), # stream all regions of an annotation
    ]

    genomic_regions_routes = [
        (genomic_regions_controller.GenomicRegionsApi, '/regions'), # list all genomic regions
        (genomic_regions_controller.GenomicRegionsQueryApi, '/regions/search'), # query genomic regions
        (genomic_regions_controller.GenomicRegionApi, '/regions/<accession>'), # get a specific genomic region
        (genomic_regions_controller.GenomicRegionRelatedStatsApi,  '/regions/<accession>/feature-types') # get the feature type stats for a genomic region
    ]

    feature_type_stats_routes = [
        (feature_types_controller.FeatureTypeStatsApi, '/feature-types'), # get the feature type stats
        (feature_types_controller.FeatureTypeStatsQueryApi, '/feature-types/search'), # query the feature type stats
    ]

    taxons_routes = [
        (taxons_controller.TaxonsApi, '/taxa'),
        (taxons_controller.TaxonomyTreeApi, '/taxa/tree'),
        (taxons_controller.TaxonAncestorsApi, '/taxa/<taxid>/ancestors'),
        (taxons_controller.TaxonChildrenApi, '/taxa/<taxid>/children'),
        (taxons_controller.TaxonClosestApi, '/taxa/<taxid>/closest'),
    ]

    db_stats_routes = [
        (stats_controller.InstanceStatsApi, '/stats'),
        (stats_controller.ModelFieldsApi, '/stats/<model>/fields'),
        (stats_controller.FieldStatsApi, '/stats/<model>/fields/<field>'),
    ]

    # Combine all route groups
    all_routes = (
        annotations_routes + annotation_download_routes + annotation_routes +
        file_stream_routes + genomic_regions_routes + feature_type_stats_routes +
        taxons_routes + db_stats_routes + tasks_routes
    )

    # Register all routes with prefix
    for resource, *paths in all_routes:
        api.add_resource(resource, *('/api' + API_VERSION + path for path in paths))



