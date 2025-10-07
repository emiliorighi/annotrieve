from .celery_utils import create_celery
from db.database import connect_to_db
from jobs.import_annotations import import_annotations

app = create_celery()

connect_to_db()
