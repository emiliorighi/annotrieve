from flask import Response,request
from flask_restful import Resource
from . import stats_service

class ModelFieldsApi(Resource):
    def get(self, model):
        fields = stats_service.get_model_fields(model)
        return Response(fields, mimetype="application/json", status=200)

class FieldStatsApi(Resource):
    def get(self, model, field):
        json_resp,status = stats_service.get_stats(model, field, request.args)
        return Response(json_resp,mimetype="application/json", status=status)
##stats about the instance
class InstanceStatsApi(Resource):
	def get(self):
		stats = stats_service.get_instance_stats()
		return Response(stats,mimetype="application/json", status=200)
