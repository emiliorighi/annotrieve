from . import taxons_service
from flask import Response,request
from flask_restful import Resource

class TaxonsApi(Resource):
    def get(self):
        response, mimetype, status = taxons_service.get_taxons(request.args)
        return Response(response, mimetype=mimetype, status=status)

class TaxonApi(Resource):
    def get(self, taxid):
        taxon = taxons_service.get_taxon(taxid)
        return Response(taxon.to_json(), mimetype="application/json", status=200)

class TaxonChildrenApi(Resource):
    def get(self, taxid):
        items = taxons_service.get_taxon_children(taxid)
        return Response(items.to_json(), mimetype="application/json", status=200)

class TaxonAncestorsApi(Resource):
    def get(self, taxid):
        items = taxons_service.get_taxon_ancestors(taxid)
        return Response(items, mimetype="application/json", status=200)

class TaxonClosestApi(Resource):
    def get(self, taxid):
        taxon = taxons_service.get_closest_taxon(taxid)
        return Response(taxon, mimetype="application/json", status=200)

class TaxonomyTreeApi(Resource):
    def get(self):
        return taxons_service.get_taxonomy_tree()