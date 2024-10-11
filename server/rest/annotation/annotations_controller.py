from flask_restful import Resource
from flask import Response, request
from . import annotations_service

class AnnotationsApi(Resource):
    def get(self):
        response, mimetype, status = annotations_service.get_annotations(request.args)
        return Response(response, mimetype=mimetype, status=status)

class AnnotationApi(Resource):
    def get(self, name):
        ann_obj = annotations_service.get_annotation(name)
        return Response(ann_obj.to_json(),mimetype="application/json", status=200)
    
class StreamAnnotations(Resource):
    def get(self,filename):
        return annotations_service.stream_annotation(filename)