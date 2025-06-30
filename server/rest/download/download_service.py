from db.models import GenomeAnnotation
from jobs.create_zip_folder import create_zip_folder
from helpers import data as data_helper, file as file_helper, query_visitors, genome_annotation as genome_annotation_helper
from werkzeug.exceptions import NotFound, BadRequest
from flask import send_from_directory, Response
import os

ANNOTATIONS_PATH= os.getenv('LOCAL_ANNOTATION_PATH')
ZIP_FOLDER_PATH= os.getenv('ZIP_FOLDER_PATH')

def download_annotation(name):
    ann = genome_annotation_helper.get_annotation(name)
    file_path = file_helper.get_annotation_file_path(ann)
    if not os.path.exists(file_path):
        raise NotFound(description=f"Annotation {name} not found")
    bgzipped_path = ann.bgzipped_path.lstrip('/') if ann.bgzipped_path.startswith('/') else ann.bgzipped_path
    return send_from_directory(ANNOTATIONS_PATH, bgzipped_path)

def prepare_download_files(query):
    query = {**query}
    genome_annotation_helper.add_completed_status(query)
    filter = query.pop('filter', None)
    q_query = query_visitors.annotation_query(filter) if filter else None
    limit = query.pop('limit', None)
    offset = query.pop('offset', 0)
    query, q_query = data_helper.create_query(query, q_query)
    annotations = GenomeAnnotation.objects(**query)
    if q_query:
        annotations = annotations.filter(q_query)
    if limit:
        annotations = annotations.skip(offset).limit(limit)
    file_paths = []
    for ann in annotations:
        file_path = file_helper.get_annotation_file_path(ann)
        if os.path.exists(file_path):
            file_paths.append(file_path)
    return file_paths

def download_annotations(args):
    file_paths = prepare_download_files(args)
    if len(file_paths) >  200:
        raise BadRequest(description="Too many annotations to download limit is 200, use bulk download instead")
    return Response(file_helper.create_zip_stream(file_paths), mimetype='application/zip', headers={
        'Content-Disposition': 'attachment; filename=annotations.zip'
    })

def download_annotations_preview(args):
    file_paths = prepare_download_files(args)
    if len(file_paths) >  200:
        raise BadRequest(description="Too many annotations to download limit is 200, use bulk download instead")

    total_bytes = sum(os.path.getsize(f) for f in file_paths if os.path.exists(f))
    response = dict(total_bytes=total_bytes, file_count=len(file_paths), estimated_total_size_mb=round(total_bytes / (1024 ** 2), 2))
    return data_helper.dump_json(response)

def download_annotations_bulk(args):
    file_paths = prepare_download_files(args)
    task = create_zip_folder.delay(file_paths, ZIP_FOLDER_PATH, {**args})
    response = {
        "message": "ZIP is being prepared.Once ready it will be available for download for 2 hours.",
        "task_id": task.id,
        "status_url": f"/download-tasks/{task.id}",
        "download_url": f"/download-tasks/{task.id}/download"
    }
    return data_helper.dump_json(response)

def download_annotations_bulk_status(task_id):
    try:
        task = create_zip_folder.AsyncResult(task_id)
        print(f"Task {task_id} state: {task.state}")
        
        if task.state == 'PENDING':
            return data_helper.dump_json({
                "status": "PENDING",
                "message": "Task is waiting for execution or unknown"
            })
        elif task.state == 'STARTED':
            return data_helper.dump_json({
                "status": "STARTED",
                "message": "Task has been started"
            })
        elif task.state == 'PROGRESS':
            return data_helper.dump_json({
                "status": "PROGRESS",
                "message": task.info.get('status', 'Task is running'),
                "current": task.info.get('current', 0),
                "total": task.info.get('total', 0)
            })
        elif task.state == 'SUCCESS':
            return data_helper.dump_json({
                "status": "SUCCESS",
                "message": "ZIP is ready for download. It will be available for 2 hours.",
                "result": task.result
            })
        elif task.state == 'FAILURE':
            return data_helper.dump_json({
                "status": "FAILURE",
                "message": "Task failed",
                "error": task.info.get('error', 'Unknown error'),
                "exception": task.info.get('exception', 'No exception details')
            })
        else:
            return data_helper.dump_json({
                "status": task.state,
                "message": f"Task is in state: {task.state}"
            })
    except Exception as e:
        return data_helper.dump_json({
            "status": "ERROR",
            "message": f"Error checking task status: {str(e)}"
        })

def download_annotations_bulk_file(task_id):
    task = create_zip_folder.AsyncResult(task_id)
    if task.state != 'SUCCESS':
        raise NotFound(description="ZIP is not ready yet")
    return send_from_directory(ZIP_FOLDER_PATH, task.result['zip_file'])
