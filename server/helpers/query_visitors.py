from mongoengine.queryset.visitor import Q
from fastapi import HTTPException
from mongoengine.queryset import QuerySet

NO_VALUE_KEY = "no_value"

def taxonomic_query(filter):
    return (Q(taxid__iexact=filter) | 
            Q(taxid__icontains=filter) |
            Q(organism_name__iexact=filter) | 
            Q(organism_name__icontains=filter))

def taxon_query(filter):
    return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def organism_query(filter):
    return taxonomic_query(filter) | (Q(common_name__iexact=filter) | Q(common_name__icontains=filter))

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


def get_stats(items:QuerySet, field:str):
    if not field:
        raise HTTPException(status_code=400, detail="Field parameter is required")
    
    try:
        pipeline = [
            {
                "$project": {
                    "field_value": {
                        "$ifNull": [f"${field}", f"{NO_VALUE_KEY}"]
                    }
                }
            },
            {"$unwind": "$field_value"},
            {
                "$group": {
                    "_id": "$field_value",
                    "count": {"$sum": 1}
                }
            },
        ]

        response = {
            str(doc["_id"]): int(doc["count"])
            for doc in items.aggregate(pipeline)
        }

        sorted_response = {key: value for key, value in sorted(response.items())}
        return sorted_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {e}")
