from flask_restful import Resource
from flask import Response, request, stream_with_context
from . import annotations_service

class AnnotationsApi(Resource):
    def get(self):
        response, mimetype, status = annotations_service.get_annotations(request.args)
        return Response(response, mimetype=mimetype, status=status)

class AnnotationLogsApi(Resource):
    def get(self):
        response, mimetype, status = annotations_service.get_annotations(request.args, hide_status=False)
        return Response(response, mimetype=mimetype, status=status)

class AnnotationQueryApi(Resource):
    def post(self):
        payload = request.json if request.is_json else request.data
        response, mimetype, status = annotations_service.get_annotations(payload)
        return Response(response, mimetype=mimetype, status=status)

class AnnotationApi(Resource):
    def get(self, annotation_name):
        ann_obj = annotations_service.get_annotation(annotation_name)
        return Response(ann_obj.to_json(),mimetype="application/json", status=200)

class AnnotationRegionsTabixApi(Resource):
    def get(self, annotation_name):
        response = annotations_service.get_annotation_regions_tabix(annotation_name)
        return Response(response, mimetype="application/json", status=200)

class AnnotationRegionTabixStreamApi(Resource):
    def get(self, annotation_name, region_name):
        args = request.args
        try:
            region_name = str(region_name)
            start = (int(args.get('start'))) if args.get('start') else 0
            end = (int(args.get('end'))) if args.get('end') else None
            stream = annotations_service.get_annotation_region_tabix_stream(annotation_name, region_name, start, end)
            
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


class AnnotationRegionsApi(Resource):
    def get(self, annotation_name):
        response, mimetype, status = annotations_service.get_annotation_regions(annotation_name, request.args)
        return Response(response, mimetype=mimetype, status=status)
