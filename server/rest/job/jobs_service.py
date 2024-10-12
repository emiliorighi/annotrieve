from jobs import retrieve_annotations, process_gffs,taxonomy
from werkzeug.exceptions import NotFound, BadRequest,Unauthorized
from celery.result import AsyncResult
import os

USER = os.getenv('USER')
PWD = os.getenv('PWD')

def launch_annotations_import(request):
    check_credentials(request)
    retrieve_annotations.get_annotations.delay()

def launch_gffs_processing(request):
    check_credentials(request)
    process_gffs.process_gff_files.delay()

def launch_tree_computing(request):
    check_credentials(request)
    taxonomy.compute_tree()

def check_credentials(request):
    data = request.json if request.is_json else request.form

    fields = ['username', 'password']
    missing_fields = [field for field in fields if field not in data]
    if missing_fields:
        raise BadRequest(description=f"Missing required files: {', '.join(missing_fields)}")

    user = data.get('username')
    pwd = data.get('password')
    if user != USER or pwd != PWD:
        raise Unauthorized(description=f"Bad username or password")
    
def get_task_status(task_id):
    task = AsyncResult(task_id)
    if task.result:
        return dict(messages=task.result['messages'], state=task.state )
    raise NotFound(description=f'{task_id} not found')