from .annotation import annotations_controller
from .taxon import taxons_controller
from .download import download_controller
from .job import jobs_controller
import os


def initialize_routes(api):
    
    # API version prefix - can be set via environment variable
    API_VERSION = os.getenv('API_VERSION', '/v1')
    
    # If API_VERSION doesn't start with '/', add it
    if not API_VERSION.startswith('/'):
        API_VERSION = f'/{API_VERSION}'
    
    # Core Resources - Annotations
    annotations_routes = [
        (annotations_controller.AnnotationsApi, '/annotations'), # GET - list/search annotations, POST - query with payload (e.g., assembly names)
        (annotations_controller.AnnotationErrorsApi, '/annotations/errors'), # GET - list annotation errors
    ]
    # Annotation Downloads Resource
    annotation_downloads_routes = [
        (download_controller.AnnotationsDownloadApi, '/downloads/annotations'), # GET - download up to 200 annotations
        (download_controller.AnnotationsDownloadBulkApi, '/downloads/annotations/jobs'), # POST - create bulk download job (up to 1k annotations)
        (download_controller.AnnotationsDownloadBulkStatusApi, '/downloads/annotations/jobs/<job_id>'), # GET - bulk download task status
        (download_controller.AnnotationsDownloadBulkFileApi, '/downloads/annotations/jobs/<job_id>/file'), # GET - download bulk file
    ]
    # Annotation-specific Resources
    annotation_specific_routes = [
        (annotations_controller.AnnotationApi, '/annotations/<annotation_name>'), # GET - specific annotation
        (annotations_controller.AnnotationRegionsApi, '/annotations/<annotation_name>/regions'), # GET - region metadata
        (annotations_controller.AnnotationGffApi, '/annotations/<annotation_name>/gff'), # GET - gff stream
        (annotations_controller.AnnotationInconsistentFeaturesApi, '/annotations/<annotation_name>/inconsistent-features'), # GET - inconsistent features
    ]

    jobs_routes = [
        (jobs_controller.JobsApi, '/jobs'), # POST - launch jobs
    ]

    # Combine all route groups
    all_routes = (
        annotations_routes + annotation_specific_routes + annotation_downloads_routes +
        jobs_routes
    )

    # Register all routes with prefix
    for resource, *paths in all_routes:
        api.add_resource(resource, *('/api' + API_VERSION + path for path in paths))



