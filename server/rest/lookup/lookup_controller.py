from . import lookup_service
from flask import Response
from flask_restful import Resource
from helpers import data
from extensions.cache import cache

##stats about the BGP instance
class LookupApi(Resource):
	@cache.cached(timeout=300)
	def get(self):
		items = lookup_service.get_instance_stats()
		return Response(data.dump_json(items),mimetype="application/json", status=200)

class OrganismRelatedDataLookup(Resource):
	@cache.cached(timeout=300)
	def get(self,taxid):
		response = lookup_service.lookup_organism_data(taxid)
		return Response(data.dump_json(response),mimetype="application/json", status=200)

class TaxonRelatedDataLookup(Resource):
	@cache.cached(timeout=300)
	def get(self,taxid):
		response = lookup_service.lookup_taxon_data(taxid)
		return Response(data.dump_json(response),mimetype="application/json", status=200)

class AssemblyRelatedDataLookup(Resource):
	@cache.cached(timeout=300)
	def get(self,accession):
		response = lookup_service.lookup_assembly_data(accession)
		return Response(data.dump_json(response), mimetype="application/json", status=200)
