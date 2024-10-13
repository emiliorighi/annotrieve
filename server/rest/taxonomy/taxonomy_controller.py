from . import taxonomy_service
from flask_restful import Resource
from jobs import taxonomy


# class RelativeTaxonomyTreeApi(Resource):
#     def get(self,taxid):
#         taxon, status = taxonomy_service.get_closest_taxon(taxid)
#         return Response(taxon.to_json(), mimetype="application/json", status=status)

class RootTreeApi(Resource):
    def get(self):
        return taxonomy_service.get_root_tree()

class GenerateTreeApi(Resource):
    def post(self):
        taxonomy.compute_tree()