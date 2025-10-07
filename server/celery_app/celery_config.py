from celery.schedules import crontab

# Celery Beat Schedule
beat_schedule = {
     'import-annotations-daily': {
        'task': 'import_annotations',  # Task name as defined in @shared_task decorator
        'schedule': crontab(hour=20, minute=0),  # Every day at 20:00 UTC (10 PM CEST / 9 PM CET)
        'options': {'expires': 3600}  # Expire after 1 hour if not started
    }
} 