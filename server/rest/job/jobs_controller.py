from flask_restful import Resource
from flask import request, Response
from werkzeug.exceptions import BadRequest
from helpers import response as response_helper
from . import jobs_service
import os


AUTH_TOKEN = os.getenv('AUTH_TOKEN')

class JobsApi(Resource):
    def post(self):
        payload = request.json if request.is_json else request.data
        if not payload.get('auth_token') or payload.get('auth_token') != AUTH_TOKEN:
            raise BadRequest(description="Invalid auth token")
        response = jobs_service.launch_job(payload)
        return Response(response_helper.dump_json(response), mimetype="application/json", status=200)
