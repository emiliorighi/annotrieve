from mongoengine.queryset.visitor import Q

def taxonomic_query(filter):
    return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def taxon_query(filter):
    return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(name__iexact=filter) | Q(name__icontains=filter))

def assembly_query(filter):
    return taxonomic_query(filter) | (Q(assembly_name__iexact=filter) | Q(assembly_name__icontains=filter)) | (Q(accession__iexact=filter) | Q(accession__icontains=filter))

def annotation_query(filter):
    return taxonomic_query(filter) | (Q(name__iexact=filter) | Q(name__icontains=filter)) | (Q(assembly_name__iexact=filter) | Q(assembly_name__icontains=filter)) | (Q(assembly_accession__iexact=filter) | Q(assembly_accession__icontains=filter))

def organism_query(filter):
    return taxonomic_query(filter) | (Q(insdc_common_name__iexact=filter) | Q(insdc_common_name__icontains=filter)) | (Q(tolid_prefix__iexact=filter) | Q(tolid_prefix__icontains=filter))

def biosample_query(filter):
    return taxonomic_query(filter) | (Q(accession__iexact=filter) | Q(accession__icontains=filter))

def local_sample_query(filter):
    return taxonomic_query(filter) | (Q(local_id__iexact=filter) | Q(local_id__icontains=filter))

def experiment_query(filter):
    return taxonomic_query(filter) | (Q(experiment_accession__iexact=filter) | Q(experiment_accession__icontains=filter)) | (Q(metadata__experiment_title__icontains=filter))

