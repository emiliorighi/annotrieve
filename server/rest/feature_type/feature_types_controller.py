from flask import request, Response
from flask_restful import Resource
from . import feature_types_service

class FeatureTypeStatsApi(Resource):
    def get(self):
        response, mimetype, status = feature_types_service.get_feature_type_stats(request.args)
        return Response(response, mimetype=mimetype, status=status)

class FeatureTypeStatsQueryApi(Resource):
    def post(self):
        payload = request.json if request.is_json else request.data
        response, mimetype, status = feature_types_service.get_feature_type_stats(payload)
        return Response(response, mimetype=mimetype, status=status)
    
class FeatureTypeStatsAnnotationRegionApi(Resource):
    def get(self, annotation_name, region_name=None):
        query = {
            'annotation_name': annotation_name,
            'region_name': region_name
        }
        response, mimetype, status = feature_types_service.get_feature_type_stats(query)
        return Response(response, mimetype=mimetype, status=status)
    
class FeatureTypeStatsAnnotationHierarchyApi(Resource):
    def get(self, annotation_name, region_name=None):
        response = feature_types_service.get_feature_type_stats_tree(annotation_name, region_name)
        return Response(response, mimetype='application/json', status=200)