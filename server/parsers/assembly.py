from db.models import GenomeAssembly

def parse_assembly(assembly):
    return GenomeAssembly(
        assembly_accession=assembly.get('assembly_accession'),
        assembly_name=assembly.get('assembly_name'),
        taxid=assembly.get('taxid'),
        scientific_name=assembly.get('scientific_name'),
        taxon_lineage=assembly.get('taxon_lineage'),
    )