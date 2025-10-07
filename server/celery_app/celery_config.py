from celery.schedules import crontab

# Celery Beat Schedule
# Timezone is set to 'Europe/Madrid' in celery_utils.py
beat_schedule = {
     'import-annotations-daily': {
        'task': 'import_annotations',  # Task name as defined in @shared_task decorator
        'schedule': crontab(day_of_week=6, hour=0, minute=0),  # Every Saturday at midnight
        'options': {'expires': 3600}  # Expire after 1 hour if not started
    }
} 