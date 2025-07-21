from jobs.create_zip_folder import create_zip_folder
from helpers import file as file_helper, genome_annotation as genome_annotation_helper, response as response_helper, query_visitors as query_visitors_helper, query as query_helper
from werkzeug.exceptions import NotFound, BadRequest
from flask import send_from_directory, Response
import os

ANNOTATIONS_PATH= os.getenv('LOCAL_ANNOTATIONS_DIR')
ZIP_FOLDER_PATH= os.getenv('ZIP_FOLDER_PATH')

def prepare_download_files(query):
    annotations = genome_annotation_helper.get_annotations_from_db(query)
    file_paths = []
    for ann in annotations:
        file_path = file_helper.get_annotation_file_path(ann)
        if os.path.exists(file_path):
            file_paths.append(file_path)
    return file_paths

def download_annotations(args):
    """
    Download up to 200 annotations as a zip file, if preview is true, return a preview of the download
    """
    if 'preview' in args and args['preview'] == 'true':
        return download_annotations_preview(args)
    file_paths = prepare_download_files(args)
    if len(file_paths) >  200:
        raise BadRequest(description="Too many annotations to download. Limit is 200, use /downloads/annotations/jobs POST instead")
    return Response(file_helper.create_zip_stream(file_paths), mimetype='application/zip', headers={
        'Content-Disposition': 'attachment; filename=annotations.zip'
    })

def download_annotations_preview(args):
    file_paths = prepare_download_files(args)
    total_bytes = sum(os.path.getsize(f) for f in file_paths if os.path.exists(f))
    response = dict(total_bytes=total_bytes, file_count=len(file_paths), estimated_total_size_mb=round(total_bytes / (1024 ** 2), 2))
    return response_helper.dump_json(response)

def download_annotations_bulk(args):
    file_paths = prepare_download_files(args)
    task = create_zip_folder.delay(file_paths, ZIP_FOLDER_PATH, {**args})
    response = {
        "message": "ZIP is being prepared.Once ready it will be available for download for 2 hours.",
        "task_id": task.id,
        "status_url": f"/downloads/annotations/jobs/{task.id}",
        "download_url": f"/downloads/annotations/jobs/{task.id}/file"
    }
    return response_helper.dump_json(response)

def download_annotations_bulk_status(task_id):
    try:
        task = create_zip_folder.AsyncResult(task_id)
        print(f"Task {task_id} state: {task.state}")
        
        if task.state == 'PENDING':
            return response_helper.dump_json({
                "status": "PENDING",
                "message": "Task is waiting for execution or unknown"
            })
        elif task.state == 'STARTED':
            return response_helper.dump_json({
                "status": "STARTED",
                "message": "Task has been started"
            })
        elif task.state == 'PROGRESS':
            return response_helper.dump_json({
                "status": "PROGRESS",
                "message": task.info.get('status', 'Task is running'),
                "current": task.info.get('current', 0),
                "total": task.info.get('total', 0)
            })
        elif task.state == 'SUCCESS':
            return response_helper.dump_json({
                "status": "SUCCESS",
                "message": "ZIP is ready for download. It will be available for 2 hours.",
                "result": task.result
            })
        elif task.state == 'FAILURE':
            return response_helper.dump_json({
                "status": "FAILURE",
                "message": "Task failed",
                "error": task.info.get('error', 'Unknown error'),
                "exception": task.info.get('exception', 'No exception details')
            })
        else:
            return response_helper.dump_json({
                "status": task.state,
                "message": f"Task is in state: {task.state}"
            })
    except Exception as e:
        return response_helper.dump_json({
            "status": "ERROR",
            "message": f"Error checking task status: {str(e)}"
        })

def download_annotations_bulk_file(task_id):
    task = create_zip_folder.AsyncResult(task_id)
    file_name = f"{task_id}.zip"
    zip_folder_path = os.path.join(ZIP_FOLDER_PATH, file_name)
    if not os.path.exists(zip_folder_path):
        raise NotFound(description="ZIP file not found")
    mime_type = 'application/zip'
    return send_from_directory(ZIP_FOLDER_PATH, file_name, mimetype=mime_type)
