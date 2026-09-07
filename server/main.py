from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.database import connect_to_db, close_db_connection
from celery_app.celery_utils import create_celery
from api.router import router as api_router
import os

def create_app() -> FastAPI:
    app = FastAPI(title="Annotrieve API (FastAPI)")

    # Configure CORS for public research API
    # Allows access from:
    # 1. Programmatic access (scripts, pipelines) - no Origin header, handled by CORS middleware
    # 2. Web frontend (genome.crg.es, GitHub Pages)
    # 3. Genome browsers embedded in other web pages (any origin)
    #
    # For a public research API, allowing all origins is appropriate:
    # - No authentication/credentials required
    # - Read-only public data
    # - Genome browsers need to work from any embedded context
    # - Security risk is minimal (no sensitive operations)
    allowed_origins_env = os.getenv("CORS_ALLOWED_ORIGINS", "")
    
    # If CORS_ALLOWED_ORIGINS is set, use specific origins (more restrictive)
    # Otherwise, allow all origins for maximum compatibility with genome browsers
    if allowed_origins_env:
        allowed_origins = [
            "http://localhost:3000",  # Development
            "https://emiliorighi.github.io",  # GitHub Pages - exact match
            "https://genome.crg.es",  # Production
        ]
        # Add any additional origins from environment variable (comma-separated)
        allowed_origins.extend([origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()])
        allow_origin_regex = None  # Use specific origins only
    else:
        # Allow all origins for public research API (genome browsers in any webpage)
        allowed_origins = ["*"]
        allow_origin_regex = None
    
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
        allow_origins=allowed_origins,  # Specific origins or ["*"] for all origins
        allow_origin_regex=allow_origin_regex,  # Regex pattern (None if using ["*"])
        allow_credentials=False,  # No authentication needed for public API - safer to disable credentials
        allow_methods=["GET", "POST", "OPTIONS", "HEAD"],  # Only allow methods actually used by the API
        allow_headers=[
            "Content-Type",      # For POST requests with JSON
            "Accept",            # For content negotiation
            "Range",             # For partial content requests (genome browsers)
            "X-Requested-With",  # Common header for AJAX requests
            "X-Zenodo-Session",  # Opaque Zenodo OAuth broker session (alternative to cookie)
        ],
        expose_headers=[
            "Content-Length",    # For file downloads
            "Content-Range",     # For Range requests (genome browsers)
            "Content-Type",      # For content type information
            "Cache-Control",     # For cache control information
        ],
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
