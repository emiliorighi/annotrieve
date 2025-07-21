from jobs.import_annotations import import_and_process_annotations
from werkzeug.exceptions import BadRequest


JOBS_MAP = {
    'import_annotations': import_and_process_annotations,
}

def launch_job(payload):
    job_type = payload.get('job_type')
    if job_type not in JOBS_MAP:
        raise BadRequest(description=f"Invalid job type: {job_type}")
    job = JOBS_MAP[job_type].delay()
    response = {
        "job_id": job.id,
        "job_status": job.status
    }
    return response

