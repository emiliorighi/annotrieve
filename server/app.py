from flask import Flask
from config import BaseConfig
from db import initialize_db
from rest import initialize_api
from jobs import celery_init_app
from flask_cors import CORS
from db.models import Assembly,GenomeAnnotation,Chromosome

app = Flask(__name__)

app.config.from_object(BaseConfig)

app.config.from_mapping(
    CELERY=dict(
        broker_url=BaseConfig.CELERY_BROKER_URL,
        result_backend=BaseConfig.CELERY_RESULT_BACKEND,
        task_ignore_result=True,
    ),
)

initialize_db(app)

celery_app = celery_init_app(app)

initialize_api(app)

Assembly.drop_collection()
GenomeAnnotation.drop_collection()
Chromosome.drop_collection()
CORS(app)
