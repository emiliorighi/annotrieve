from mongoengine.queryset.visitor import Q

def taxonomic_query(filter):
    return (Q(taxid__iexact=filter) | 
            Q(taxid__icontains=filter) |
            Q(scientific_name__iexact=filter) | 
            Q(scientific_name__icontains=filter))

def taxon_query(filter):
    return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(name__iexact=filter) | Q(name__icontains=filter))

def assembly_query(filter):
    return taxonomic_query(filter) | (
            Q(assembly_name__iexact=filter) | 
            Q(assembly_name__icontains=filter)
        ) | (
            Q(assembly_accession__iexact=filter) | 
            Q(assembly_accession__icontains=filter)
        )

def annotation_query(filter):
    return taxonomic_query(filter) | assembly_query(filter) | (Q(name__iexact=filter) | Q(name__icontains=filter))

def region_query(filter):
    return annotation_query(filter) | (
        Q(name__iexact=filter) | Q(name__icontains=filter)) | (
            Q(insdc_accession__iexact=filter) | Q(insdc_accession__icontains=filter))

def region_feature_query(filter):
    return annotation_query(filter) | (Q(genomic_region_accession__iexact=filter) | Q(genomic_region_accession__icontains=filter)) | (Q(genomic_region_name__iexact=filter) | Q(genomic_region_name__icontains=filter))

def feature_type_stats_query(filter):
    return (Q(assembly_accession__iexact=filter) | Q(assembly_accession__icontains=filter)) | (Q(annotation_name__iexact=filter) | Q(annotation_name__icontains=filter)) | (Q(region_accession__iexact=filter) | Q(region_accession__icontains=filter)) | (Q(region_name__iexact=filter) | Q(region_name__icontains=filter))