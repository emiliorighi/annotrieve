from flask_restful import Resource
from flask import Response, request, stream_with_context
from . import stream_service

class AnnotationRegionsAliasesTabixApi(Resource):
    def get(self, annotation_name):
        response = stream_service.get_annotation_regions_tabix_aliases(annotation_name)
        return Response(response, mimetype="application/json", status=200)

class AnnotationRegionTabixStreamApi(Resource):
    def get(self, annotation_name, region_name=None):
        args = request.args
        try:
            region_name = str(region_name) if region_name else None
            start = (int(args.get('start'))) if args.get('start') else 0
            end = (int(args.get('end'))) if args.get('end') else None
            stream = stream_service.get_annotation_region_tabix_stream(annotation_name, region_name, start, end)
            
            def generate():
                try:
                    for line in stream:
                        yield line + '\n'
                except Exception as e:
                    yield f"Error: {str(e)}\n"
            
            return Response(
                stream_with_context(generate()), 
                mimetype="text/plain", 
                status=200,
                headers={
                    'Cache-Control': 'no-cache',
                    'X-Accel-Buffering': 'no'
                }
            )
        except Exception as e:
            return Response(f"Error: {str(e)}", mimetype="text/plain", status=500)
