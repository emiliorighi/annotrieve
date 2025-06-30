from celery.schedules import crontab

# Celery Beat Schedule
beat_schedule = {
    'retrieve-annotations': {
        'task': 'retrieve_annotations',
        'schedule': crontab(day_of_week='fri', hour=23, minute=0),  # Friday night at 11 PM
    },
    'process-pending-annotations': {
        'task': 'process_pending_annotations',
        'schedule': crontab(day_of_week='sat', hour=23, minute=0),  # Saturday night at 11 PM
    },
    'process-stats': {
        'task': 'process_stats',
        'schedule': crontab(day_of_week='sun', hour=23, minute=0),  # Sunday night at 11 PM
    },
    'clean-zip-folder': {
        'task': 'clean_zip_folder',
        'schedule': crontab(hour='*/1'),  # Every hour
    }
} 