from db.models import Assembly

def parse_assembly_from_ncbi_datasets(assembly):
    organism = assembly.get('organism', {})
    assembly_to_save={
        'scientific_name': organism.get('organism_name'),
        'taxid': str(organism.get('tax_id')),
        **assembly,
    }
    
    return Assembly(**assembly_to_save)
