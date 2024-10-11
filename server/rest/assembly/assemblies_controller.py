from flask_restful import Resource
from flask import Response, request
import json
from . import assemblies_service
from flask_jwt_extended import jwt_required
from wrappers.data_manager import data_manager_required
from wrappers.admin import admin_required

class AssembliesApi(Resource):
    def get(self):
        resp, mimetype, status = assemblies_service.get_assemblies(request.args)
        return Response(resp, mimetype=mimetype, status=status)

class AssemblyApi(Resource):
    def get(self,accession):
        assembly_obj = assemblies_service.get_assembly(accession)
        return Response(assembly_obj.to_json(), mimetype="application/json", status=200)

class AssemblyRelatedAnnotationsApi(Resource):
    def get(self, accession):
        return Response(assemblies_service.get_related_annotations(accession), mimetype="application/json", status=200)

class AssemblyChrAliasesApi(Resource):
    def get(self,accession):
        return assemblies_service.get_chr_aliases_file(accession)

class AssembliesRelatedChromosomesApi(Resource):
    def get(self,accession):
        chromosomes = assemblies_service.get_related_chromosomes(accession)
        return Response(chromosomes.to_json(), mimetype="application/json", status=200)
