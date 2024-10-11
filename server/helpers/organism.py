from db.models import Organism
from clients import ebi_client,ncbi_datasets
from parsers import taxonomy as taxonomy_parser, organism as organism_parser
from . import taxonomy as taxonomy_helper

def handle_organism(taxid):
    organism_obj = Organism.objects(taxid=taxid).first()
    if not organism_obj:
        organism_obj = create_organism_and_related_taxons(taxid)
    return organism_obj

def create_organism_and_related_taxons(taxid):
    organism_obj, parsed_taxons = retrieve_taxonomic_info(taxid)
    if not organism_obj:
        return None
    
    organism_obj.save()

    if parsed_taxons:
        taxonomy_helper.save_taxons_and_update_hierachy(parsed_taxons, organism_obj)

    return organism_obj

def retrieve_taxonomic_info(taxid):
    organism_data = {}
    parsed_taxons = []

    organism_data, parsed_taxons = get_info_from_ncbi(taxid)
    if organism_data:
        return organism_data, parsed_taxons

    organism_data, parsed_taxons = get_info_from_ena_browser(taxid)
    if organism_data:
        return organism_data, parsed_taxons

    organism_data, parsed_taxons = get_info_from_ena_portal(taxid)
    if organism_data:
        return organism_data, parsed_taxons

    return None, None


def get_info_from_ncbi(taxid):
    args = ['taxonomy', 'taxon', taxid, '--parents']
    report = ncbi_datasets.get_data_from_ncbi(args)
    if report and report.get('reports'):
        organism_to_save = None
        for taxon_report in report.get('reports'):
            if str(taxon_report.get('tax_id')) == taxid:
                organism_to_save = organism_parser.parse_organism_from_ncbi_dataset(taxon_report)
        parsed_taxons = taxonomy_parser.parse_taxons_from_ncbi_datasets(report.get('reports'))
        return organism_to_save, parsed_taxons
    return None, None

def get_info_from_ena_browser(taxid):
    taxon_xml = ebi_client.get_taxon_from_ena_browser(taxid)
    if taxon_xml:
        organism_to_parse, parsed_taxons = taxonomy_parser.parse_taxon_from_ena_browser(taxon_xml)
        organism_to_save = organism_parser.parse_organism_from_ena_browser(organism_to_parse, parsed_taxons)
        return organism_to_save, parsed_taxons
    return None, None

def get_info_from_ena_portal(taxid):
    taxon = ebi_client.get_taxon_from_ena_portal(taxid)
    if taxon:
        taxon_to_parse = taxon[0]
        organism_to_save = organism_parser.parse_organism_from_ena_portal(taxon_to_parse)
        parsed_taxons = [taxonomy_parser.parse_taxon_from_ena_portal(taxon_to_parse)]
        for lineage_taxid in organism_to_save.taxon_lineage:
            if lineage_taxid != taxid:
                lineage_taxon = ebi_client.get_taxon_from_ena_portal(lineage_taxid)
                if lineage_taxon:
                    parsed_taxons.append(taxonomy_parser.parse_taxon_from_ena_portal(lineage_taxon[0]))
        return organism_to_save, parsed_taxons
    return None, None
