from . import organisms_service
from flask import Response, request
from flask_restful import Resource
import json

class OrganismsApi(Resource):
	def get(self):
		response, mimetype, status = organisms_service.get_organisms(request.args)
		return Response(response, mimetype=mimetype, status=status)
    
class OrganismApi(Resource):
	def get(self, taxid):
		organism_obj = organisms_service.get_organism(taxid)
		return Response(organism_obj.to_json(),mimetype="application/json", status=200)
	
class OrganismRelatedDataApi(Resource):
	def get(self, taxid, model):
		items = organisms_service.get_organism_related_data(taxid, model)
		return Response(items.to_json(),mimetype="application/json", status=200)

class OrganismLineageApi(Resource):
	def get(self,taxid):
		organism_obj = organisms_service.get_organism(taxid)
		tree = organisms_service.map_organism_lineage(organism_obj.taxon_lineage)
		return Response(json.dumps(tree),mimetype="application/json", status=200)
	