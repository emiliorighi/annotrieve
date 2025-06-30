from flask import request, Response
from flask_restful import Resource
from . import genomic_regions_service

class GenomicRegionsApi(Resource):
    def get(self):
        response, mimetype, status = genomic_regions_service.get_genomic_regions(request.args)
        return Response(response, mimetype=mimetype, status=status)

class GenomicRegionsQueryApi(Resource):
    def post(self):
        payload = request.json if request.is_json else request.data
        response, mimetype, status = genomic_regions_service.get_genomic_regions(payload)
        return Response(response, mimetype=mimetype, status=status)
    
class GenomicRegionApi(Resource):
    def get(self, accession):
        response = genomic_regions_service.get_genomic_region(accession)
        return Response(response, mimetype="application/json", status=200)

class GenomicRegionRelatedStatsApi(Resource):
    def get(self, accession):
        response = genomic_regions_service.get_genomic_region_stats(accession, request.args)
        return Response(response, mimetype="application/json", status=200)