from flask_restful import Resource
from flask import Response, request, stream_with_context
from . import annotations_service
from helpers import response as response_helper
import json

class AnnotationsApi(Resource):
    def get(self):
        """GET /annotations - List/search annotations with query parameters"""
        try:
            response, mimetype, status = annotations_service.get_annotations(**request.args)
            return response_helper.create_streaming_response(response, mimetype, status)
                
        except Exception as e:
            error_response = {
                "error": {
                    "code": "QUERY_ERROR",
                    "message": str(e)
                },
                "meta": {
                    "timestamp": "2024-01-15T10:30:00Z"
                }
            }
            return Response(json.dumps(error_response), mimetype="application/json", status=500)

    def post(self):
        """POST /annotations - Query annotations with JSON payload"""
        try:
            # Get payload from request
            payload = {}
            if request.is_json:
                payload = request.get_json()
            else:
                payload = request.get_data()
                if payload:
                    payload = json.loads(payload)
            
            response, mimetype, status = annotations_service.get_annotations(**payload)
            return response_helper.create_streaming_response(response, mimetype, status)
                
        except Exception as e:
            error_response = {
                "error": {
                    "code": "QUERY_ERROR",
                    "message": str(e)
                },
                "meta": {
                    "timestamp": "2024-01-15T10:30:00Z"
                }
            }
            return Response(json.dumps(error_response), mimetype="application/json", status=500)

class AnnotationErrorsApi(Resource):
    def get(self):
        response = annotations_service.get_annotation_errors(**request.args)
        return Response(response, mimetype="application/json", status=200)

class AnnotationApi(Resource):
    def get(self, annotation_name):
        ann_obj = annotations_service.get_annotation(annotation_name)
        return Response(ann_obj.to_json(),mimetype="application/json", status=200)

class AnnotationGffApi(Resource):
    def get(self, annotation_name):
        return annotations_service.get_annotation_gff(annotation_name, **request.args)

class AnnotationRegionsApi(Resource):
    def get(self, annotation_name):
        response = annotations_service.get_annotation_regions(annotation_name)
        return Response(response, mimetype='application/json', status=200)

class AnnotationInconsistentFeaturesApi(Resource):
    def get(self, annotation_name):
        response = annotations_service.get_annotation_inconsistent_features(annotation_name)
        return Response(response, mimetype='application/json', status=200)