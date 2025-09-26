from celery import Celery
from .celery_config import beat_schedule
from configs.app_settings import settings

def create_celery():
    celery_app = Celery("tasks")
    celery_app.conf.broker_url = settings.CELERY_BROKER_URL
    celery_app.conf.result_backend = settings.CELERY_RESULT_BACKEND
    celery_app.conf.beat_schedule = beat_schedule
    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
    )
    return celery_app 