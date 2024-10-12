from flask_restful import Resource
from flask import Response, request
from . import jobs_service
import json

class CheckJobStatusAPI(Resource):
    def get(self, task_id):
        response = jobs_service.get_task_status(task_id)
        return Response(json.dumps(response), mimetype="application/json", status=200)
        
class UploadAnnotationsAPI(Resource):
    def post(self):
        resp = jobs_service.launch_annotations_import(request)
        return Response(json.dumps(resp), mimetype="application/json", status=200)

class ComputeTree(Resource):
    def post(self):
        resp = jobs_service.launch_tree_computing(request)
        return Response(json.dumps(resp), mimetype="application/json", status=200)

class ProcessAnnotations(Resource):
    def post(self):
        resp = jobs_service.process_gffs(request)
        return Response(json.dumps(resp), mimetype="application/json", status=200)
