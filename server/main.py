from fastapi import FastAPI
from db.database import connect_to_db, close_db_connection
from celery_app.celery_utils import create_celery
from api.router import router as api_router
from jobs.import_annotations import import_annotations
from db.models import GenomeAnnotation, drop_all_collections
def create_app() -> FastAPI:
    app = FastAPI(title="Annotrieve API (FastAPI)")

    @app.on_event("startup")
    async def startup_event():
        connect_to_db()                                 
        #drop_all_collections()
        # Trigger import_annotations task on startup only if empty database
        if GenomeAnnotation.objects().count() == 0:
            print("Triggering import_annotations task on startup...")

            import_annotations.delay()

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
