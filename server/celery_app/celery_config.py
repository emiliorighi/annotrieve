from celery.schedules import crontab

# Celery Beat Schedule
# Timezone is set to 'Europe/Madrid' in celery_utils.py
beat_schedule = {
     'import-annotations-daily': {
        'task': 'import_annotations',  # Task name as defined in @shared_task decorator
        'schedule': crontab(hour=18, minute=0),  # 18:00 UTC = 20:00 CEST (summer) / 19:00 CET (winter)
        'options': {'expires': 3600}  # Expire after 1 hour if not started
    }
} 