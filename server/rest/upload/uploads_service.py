from jobs import retrieve_annotations
from werkzeug.exceptions import NotFound
from celery.result import AsyncResult
import os

USER = os.getenv('USER')
PWD = os.getenv('PWD')

def launch_matrix_job():
    task = retrieve_annotations.get_annotations.delay()
    return dict(id=task.id, state=task.state )


def get_task_status(task_id):
    task = AsyncResult(task_id)
    if task.result:
        return dict(messages=task.result['messages'], state=task.state )
    raise NotFound(description=f'{task_id} not found')