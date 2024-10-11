from flask import Response,request
from flask_restful import Resource
from . import stats_service


class FieldStatsApi(Resource):
    def get(self, model, field):
        json_resp,status = stats_service.get_stats(model, field, request.args)
        return Response(json_resp,mimetype="application/json", status=status)

