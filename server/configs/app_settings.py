import os


class Settings:
    # MongoDB Settings
    MONGODB_DB: str = os.environ["DB_NAME"]
    MONGODB_HOST: str = os.environ["DB_HOST"]
    MONGODB_PORT: int = int(os.environ["DB_PORT"])
    MONGODB_USERNAME: str = os.environ["DB_USER"]
    MONGODB_PASSWORD: str = os.environ["DB_PASS"]

    # Celery Settings
    CELERY_RESULT_BACKEND: str = os.environ["CELERY_RESULT_BACKEND"]
    CELERY_BROKER_URL: str = os.environ["CELERY_BROKER_URL"]

    # Upload limits (for custom GFF uploads)
    # Max accepted payload size in bytes (default: 1.5 GiB)
    UPLOAD_MAX_BYTES: int = int(os.getenv("UPLOAD_MAX_BYTES", 1536 * 1024 * 1024))
    # Max accepted uploads per IP+User-Agent in a rolling 24h window (default: 50)
    UPLOAD_DAILY_LIMIT: int = int(os.getenv("UPLOAD_DAILY_LIMIT", 50))
    # Subdirectory under LOCAL_ANNOTATIONS_DIR where temporary uploads are stored
    UPLOAD_TMP_SUBDIR: str = os.getenv("UPLOAD_TMP_SUBDIR", "uploads_tmp")

    # Zenodo OAuth (optional until keys are configured)
    ZENODO_CLIENT_ID: str = os.getenv("ZENODO_CLIENT_ID", "")
    ZENODO_CLIENT_SECRET: str = os.getenv("ZENODO_CLIENT_SECRET", "")
    # Production: https://zenodo.org — sandbox: https://sandbox.zenodo.org
    ZENODO_BASE_URL: str = os.getenv("ZENODO_BASE_URL", "https://zenodo.org").rstrip("/")
    # Must match the redirect URI registered on the Zenodo application exactly
    ZENODO_REDIRECT_URI: str = os.getenv("ZENODO_REDIRECT_URI", "")
    ZENODO_OAUTH_SCOPES: str = os.getenv(
        "ZENODO_OAUTH_SCOPES", "deposit:write deposit:actions"
    )
    # Where the OAuth callback sends the browser after success/failure
    ZENODO_FRONTEND_RETURN_URL: str = os.getenv(
        "ZENODO_FRONTEND_RETURN_URL", "/annotrieve/"
    )
    # Browser cookie holding the opaque Annotrieve↔Zenodo session id
    ZENODO_SESSION_COOKIE: str = os.getenv("ZENODO_SESSION_COOKIE", "annotrieve_zenodo_sid")
    ZENODO_SESSION_TTL_SECONDS: int = int(
        os.getenv("ZENODO_SESSION_TTL_SECONDS", str(60 * 60 * 24 * 30))
    )
    ZENODO_COOKIE_SECURE: bool = os.getenv("ZENODO_COOKIE_SECURE", "true").lower() in (
        "1",
        "true",
        "yes",
    )
    # Rolling hourly cap per client IP for oauth start + callback (anti-spam)
    ZENODO_OAUTH_HOURLY_LIMIT: int = int(os.getenv("ZENODO_OAUTH_HOURLY_LIMIT", "30"))


settings = Settings()