from flask_restful import Resource
from flask import Response, request
from . import uploads_service
import json

class CheckJobStatusAPI(Resource):
    def get(self, task_id):
        response = uploads_service.get_task_status(task_id)
        return Response(json.dumps(response), mimetype="application/json", status=200)
        
class UploadMatrixAPI(Resource):
    def post(self):
        resp = uploads_service.launch_matrix_market_job(request)
        return Response(json.dumps(resp), mimetype="application/json", status=200)

class UploadTSVAPI(Resource):
    def post(self):
        resp = uploads_service.launch_tsv_job(request)
        return Response(json.dumps(resp), mimetype="application/json", status=200)

