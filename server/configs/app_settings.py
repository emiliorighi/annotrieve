import os

class Settings:
    # MongoDB Settings
    MONGODB_DB: str = os.environ['DB_NAME']
    MONGODB_HOST: str = os.environ['DB_HOST']
    MONGODB_PORT: int = int(os.environ['DB_PORT'])
    MONGODB_USERNAME: str = os.environ['DB_USER']
    MONGODB_PASSWORD: str = os.environ['DB_PASS']

    # Celery Settings
    CELERY_RESULT_BACKEND: str = os.environ['CELERY_RESULT_BACKEND']
    CELERY_BROKER_URL: str = os.environ['CELERY_BROKER_URL']

settings = Settings() 