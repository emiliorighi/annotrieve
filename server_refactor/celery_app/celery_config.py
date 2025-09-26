from celery.schedules import crontab

# Celery Beat Schedule
beat_schedule = {
    'cleanup-zip-folders-every-day': {
        'task': 'jobs.clean_zip_folder.clean_zip_folder',
        'schedule': crontab(hour=0, minute=0) # runs daily at midnight
    }
    # 'import-annotations-on-startup': {
    #     'task': 'jobs.import_annotations.import_annotations',
    #     'schedule': crontab(minute=0, hour=0),  # Run once at startup (you can adjust this)
    #     'options': {'expires': 120}  # Expire after 2 minutes if not started
    # }
} 