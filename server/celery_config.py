from celery.schedules import crontab

# Celery Beat Schedule
beat_schedule = {
    'import-and-process-annotations': {
        'task': 'import_and_process_annotations',
        'schedule': crontab(minute=0, hour=23, day_of_week='sunday'),  # Every sunday at 11:00 PM
    },
    'clean-zip-folder': {
        'task': 'clean_zip_folder',
        'schedule': crontab(minute=0),  # Every hour
    }
}                       