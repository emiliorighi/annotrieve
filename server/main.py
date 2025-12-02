from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from db.database import connect_to_db, close_db_connection
from celery_app.celery_utils import create_celery
from api.router import router as api_router
from jobs.import_annotations import import_annotations
import os

def create_app() -> FastAPI:
    app = FastAPI(title="Annotrieve API (FastAPI)")

    # Configure CORS to allow requests from GitHub Pages and other origins
    # The browser blocks responses if the Origin header doesn't match allowed origins
    # When frontend is on GitHub Pages (emiliorighi.github.io), it makes requests to genome.crg.es
    # The browser sends Origin: https://emiliorighi.github.io, which must be allowed
    allowed_origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "")
    allowed_origins = [
        "http://localhost:3000",  # Development
        "https://emiliorighi.github.io",  # GitHub Pages - exact match
        "https://genome.crg.es",  # Production
    ]
    
    # Add any additional origins from environment variable (comma-separated)
    if allowed_origins_env:
        allowed_origins.extend([origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()])
    
    # Use regex pattern to allow all GitHub Pages subdomains (more flexible)
    # This handles any *.github.io subdomain, localhost variations, and genome.crg.es
    # Pattern explanation:
    # - https?://(localhost|127\.0\.0\.1)(:\d+)? - localhost with optional port
    # - https://.*\.github\.io - any GitHub Pages subdomain
    # - https://genome\.crg\.es - production domain
    allow_origin_regex = r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.github\.io|https://genome\.crg\.es"
    
    # CORS middleware processes all responses (including errors) and adds appropriate headers
    # It must be added before routes are registered
    # 
    # Intermittent CORS issues on landing page:
    # - Landing page makes 3 parallel GET requests (simple requests, no preflight)
    # - GET requests with Accept: application/json don't trigger OPTIONS preflight
    # - Issue is likely CORS headers not being present in responses consistently
    #
    # Solution: 
    # - Use both exact origins and regex for maximum compatibility
    # - max_age only helps for POST/PUT/DELETE that trigger preflight (not GET)
    # - The real fix is ensuring middleware processes ALL responses
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,  # Exact matches (fastest, checked first)
        allow_origin_regex=allow_origin_regex,  # Regex pattern for flexible matching (fallback)
        allow_credentials=False,  # No authentication needed for public API - safer to disable credentials
        allow_methods=["GET", "POST", "OPTIONS", "HEAD"],  # Only allow methods actually used by the API
        allow_headers=["*"],  # Allow all headers (needed for Content-Type, Accept, etc.)
        expose_headers=["*"],  # Expose all headers to client
        max_age=86400,  # Cache preflight OPTIONS requests for 24 hours
    )

    @app.on_event("startup")
    async def startup_event():
        connect_to_db()
        
    @app.on_event("shutdown")
    async def shutdown_event():
        close_db_connection()

    app.celery_app = create_celery()
    app.include_router(api_router)

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app

app = create_app() 
print(f"App created")
