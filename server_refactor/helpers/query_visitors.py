from mongoengine.queryset.visitor import Q

def taxonomic_query(filter):
    return (Q(taxid__iexact=filter) | 
            Q(taxid__icontains=filter) |
            Q(organism_name__iexact=filter) | 
            Q(organism_name__icontains=filter))

def taxon_query(filter):
    return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def assembly_query(filter):
    return taxonomic_query(filter) | (
            Q(assembly_name__iexact=filter) | 
            Q(assembly_name__icontains=filter)
        ) | (
            Q(assembly_accession__iexact=filter) | 
            Q(assembly_accession__icontains=filter)
        )

def annotation_query(filter):
    return taxonomic_query(filter) | assembly_query(filter) | (Q(source_info__database__iexact=filter) | Q(source_info__database__icontains=filter))
