from .celery_utils import create_celery
from db.database import connect_to_db
from jobs.import_annotations import import_annotations
from jobs.updates import update_assembly_fields, update_annotation_fields, update_feature_stats, update_bioprojects

app = create_celery()

connect_to_db()
