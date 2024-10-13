from . import lookup_service
from flask import Response
from flask_restful import Resource
from helpers import data

##stats about the BGP instance
class LookupApi(Resource):
	
	def get(self):
		items = lookup_service.get_instance_stats()
		return Response(data.dump_json(items),mimetype="application/json", status=200)

class OrganismRelatedDataLookup(Resource):
	
	def get(self,taxid):
		response = lookup_service.lookup_organism_data(taxid)
		return Response(data.dump_json(response),mimetype="application/json", status=200)

class TaxonRelatedDataLookup(Resource):
	
	def get(self,taxid):
		response = lookup_service.lookup_taxon_data(taxid)
		return Response(data.dump_json(response),mimetype="application/json", status=200)

class AssemblyRelatedDataLookup(Resource):
	
	def get(self,accession):
		response = lookup_service.lookup_assembly_data(accession)
		return Response(data.dump_json(response), mimetype="application/json", status=200)
