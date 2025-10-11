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
        # First, check if the field is a DictField by sampling a document
        sample_doc = items.first()
        field_value = sample_doc
        for part in field.split('.'):
            field_value = getattr(field_value, part, None) if hasattr(field_value, part) else field_value.get(part) if isinstance(field_value, dict) else None
            if field_value is None:
                break
        
        # If the field is a dict, use a different pipeline to unpack and sum values
        is_dict_field = isinstance(field_value, dict)
        
        if is_dict_field:
            # Pipeline for DictField: unpack the dictionary and sum values by key
            pipeline = [
                {
                    "$project": {
                        "field_value": {
                            "$ifNull": [f"${field}", {}]
                        }
                    }
                },
                {
                    "$project": {
                        "field_array": {"$objectToArray": "$field_value"}
                    }
                },
                {"$unwind": "$field_array"},
                {
                    "$group": {
                        "_id": "$field_array.k",
                        "count": {"$sum": "$field_array.v"}
                    }
                }
            ]
        else:
            # Original pipeline for regular fields
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
            for doc in sorted(items.aggregate(pipeline), key=lambda x: x["count"], reverse=True)
        }

        sorted_response = {key: value for key, value in sorted(response.items(), key=lambda item: item[1], reverse=True)} #sort desc by value
        return sorted_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {e}")
