from db.models import Assembly, Chromosome, GenomeAnnotation
from werkzeug.exceptions import BadRequest, NotFound
from helpers import data
from flask import send_file
import io

def get_related_chromosomes(accession):
    get_assembly(accession)
    return Chromosome.objects(assembly_accession=accession).exclude('id')

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
    # Fetch the assembly object from the database using the provided accession
    assembly_obj = get_assembly(accession)
    chromosomes = get_related_chromosomes(accession)
    # Check if the assembly has chromosome aliases
    if not chromosomes:
        raise BadRequest(description=f"Assembly {accession} lacks of chromosomes")

    # Generate TSV content from MongoDB document data (example fields: chromosome_names and accession_versions)
    tsv_data = "chr_name\taccession_version\n"
    for chromosome in chromosomes.as_pymongo():
        tsv_data += f"{chromosome['name']}\t{chromosome['accession_version']}\n"

    # Convert the TSV data into a BytesIO object to serve it as a file
    tsv_bytes = io.BytesIO(tsv_data.encode('utf-8'))

    # Return the file as a download response
    return send_file(
        tsv_bytes,
        mimetype='text/plain',
        as_attachment=True,
        download_name=f'{assembly_obj.accession}_chr_aliases.txt'
    )
