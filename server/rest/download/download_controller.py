from flask_restful import Resource
from flask import Response, request
from . import download_service

class AnnotationsDownloadPreviewApi(Resource):
    def get(self):
        response = download_service.download_annotations_preview(request.args)
        return Response(response, mimetype="application/json", status=200)

    def post(self):
        payload = request.json if request.is_json else request.data
        response = download_service.download_annotations_preview(payload)
        return Response(response, mimetype="application/json", status=200)

class AnnotationsDownloadApi(Resource):
    def get(self):
        return download_service.download_annotations(request.args)
    
    def post(self):
        payload = request.json if request.is_json else request.data
        return download_service.download_annotations(payload)

class AnnotationsDownloadBulkApi(Resource):
    def post(self):
        payload = request.json if request.is_json else request.data
        response = download_service.download_annotations_bulk(payload)
        return Response(response, mimetype="application/json", status=200)
    
class AnnotationsDownloadBulkStatusApi(Resource):
    def get(self, task_id):
        response = download_service.download_annotations_bulk_status(task_id)
        return Response(response, mimetype="application/json", status=200)
    
class AnnotationsDownloadBulkFileApi(Resource):
    def get(self, task_id):
        return download_service.download_annotations_bulk_file(task_id)
