from flask import Flask
from config import BaseConfig
from db import initialize_db
from rest import initialize_api
from jobs import celery_init_app, import_annotations, clean_zip_folder #import jobs here
from flask_cors import CORS
from celery_config import beat_schedule

app = Flask(__name__)

app.config.from_object(BaseConfig)

app.config.from_mapping(
    CELERY=dict(
        broker_url=BaseConfig.CELERY_BROKER_URL,
        result_backend=BaseConfig.CELERY_RESULT_BACKEND,
        beat_schedule=beat_schedule,
    ),
)

initialize_db(app)
celery_app = celery_init_app(app)

initialize_api(app)

CORS(app)

#GenomeAnnotation.drop_collection() 
#GenomicRegion.drop_collection()
#TaxonNode.drop_collection()
#FeatureTypeStatsNode.drop_collection()