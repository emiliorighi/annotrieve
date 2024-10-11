from db.models import GenomeAnnotation


#expected header
HEADER={
    'name':0,
    'assembly_accession':1,
    'assembly_name':2,
    'scientific_name':2,
    'taxid':4,
    'source_link':5
}

def parse_annotation(row):
    annot_obj=GenomeAnnotation(**{k:row[v] for k,v in HEADER.items()})
    #get some metatadat from source link
    annot_obj.source_db = 'ensembl' if 'ensembl' in annot_obj.source_link else 'ncbi'
    return annot_obj