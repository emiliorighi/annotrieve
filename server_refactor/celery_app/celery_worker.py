from .celery_utils import create_celery
from db.database import connect_to_db
import jobs


app = create_celery()

connect_to_db()
