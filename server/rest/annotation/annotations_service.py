from db.models import GenomeAnnotation, Assembly
from helpers import data as data_helper
from werkzeug.exceptions import NotFound
from flask import send_from_directory
import os

ANNOTATIONS_PATH= os.getenv('LOCAL_ANNOTATION_PATH')

def get_annotations(args):
    return data_helper.get_items('annotations', args)

def get_assembly(assembly_accession):
    assembly_obj = Assembly.objects(accession=assembly_accession).first()
    if not assembly_obj:
        raise NotFound(description=f"Assembly {assembly_accession} not found")
    return assembly_obj

def get_annotation(name):
    ann_obj = GenomeAnnotation.objects(name=name).first()
    if not ann_obj:
        raise NotFound(description=f"Annotation {name} not found")
    return ann_obj

def stream_annotation(filename):
    mime_type = 'binary/octet-stream'
    return send_from_directory(ANNOTATIONS_PATH, filename, conditional=True, mimetype=mime_type)