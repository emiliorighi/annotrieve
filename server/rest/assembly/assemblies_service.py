from db.models import Assembly, Chromosome, GenomeAnnotation
from werkzeug.exceptions import BadRequest, Conflict, NotFound
from clients import ncbi_client, genomehubs_client
from parsers import assembly
from helpers import data, organism, biosample as biosample_helper, assembly as assembly_helper
from flask import send_file
import io

def get_related_chromosomes(accession):
    assembly = get_assembly(accession)
    return Chromosome.objects(accession_version__in=assembly.chromosomes).exclude('id')

def get_assemblies(args):
    return data.get_items('assemblies', args)

def get_assembly(assembly_accession):
    assembly_obj = Assembly.objects(accession=assembly_accession).first()
    if not assembly_obj:
        raise NotFound(description=f"Assembly {assembly_accession} not found")
    return assembly_obj

def get_related_annotations(accession):
    get_assembly(accession)
    return GenomeAnnotation.objects(assembly_accession=accession).exclude('id','created').to_json()

def get_chr_aliases_file(accession):
    assembly_obj = get_assembly(accession)
    if not assembly_obj.has_chromosomes_aliases:
        raise BadRequest(description=f"Assembly {accession} lacks of chromosome aliases file")
    return send_file(
    io.BytesIO(assembly_obj.chromosomes_aliases),
    mimetype='text/plain',
    as_attachment=True,
    download_name=f'{assembly_obj.accession}_chr_aliases.txt')
    