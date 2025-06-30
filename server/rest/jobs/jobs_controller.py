from flask_restful import Resource
from flask import Response
from jobs.retrieve_annotations import retrieve_annotations
from jobs.process_gffs import process_pending_annotations
from jobs.process_stats import process_stats
import json

class JobsApi(Resource):
    def post(self):
        #launch jobs
        retrieve_annotations_job = retrieve_annotations.delay()
        process_pending_annotations_job = process_pending_annotations.delay()
        process_stats_job = process_stats.delay()
        response = {'launched_jobs': [retrieve_annotations_job.id, process_pending_annotations_job.id, process_stats_job.id]}
        return Response(json.dumps(response), mimetype="application/json", status=200)