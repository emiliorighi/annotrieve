from db.models import GenomicRegion
from helpers import data as data_helper, file as file_helper, genome_annotation as genome_annotation_helper
from werkzeug.exceptions import NotFound, BadRequest
import pysam    

def get_annotation_regions_tabix_aliases(name):
    ann = genome_annotation_helper.get_annotation(name)
    file_path = file_helper.get_annotation_file_path(ann)
    try:
        file = pysam.TabixFile(file_path)
        reference_names = file.contigs
        existing_regions = GenomicRegion.objects(assembly_accession=ann.assembly_accession)
        #map ref names to regions
        mapped_regions = []
        for existing_region in existing_regions:
            role = existing_region.role
            if existing_region.name in reference_names:
                mapped_regions.append({
                    'gff_region': existing_region.name,
                    'region_alias': existing_region.insdc_accession,
                    'role': role
                })
            elif existing_region.insdc_accession in reference_names:
                mapped_regions.append({
                    'gff_region': existing_region.insdc_accession,
                    'region_alias': existing_region.name,
                    'role': role
                })
        return data_helper.dump_json(mapped_regions)
    except ValueError:
        raise NotFound(description=f"Annotation {name} not found")
    except Exception as e:
        raise BadRequest(description=f"Error fetching annotation {name}: {e}")

def get_annotation_region_tabix_stream(name, region_name=None, start=0, end=None):
    ann = genome_annotation_helper.get_annotation(name)
    file_path = file_helper.get_annotation_file_path(ann)
    try:
        file = pysam.TabixFile(file_path)
        if region_name:
            return file.fetch(region_name, start, end)
        else:
            return file.fetch()
    except ValueError:
        raise NotFound(description=f"Annotation {name} not found")
    except Exception as e:
        raise BadRequest(description=f"Error fetching annotation {name}: {e}")
    