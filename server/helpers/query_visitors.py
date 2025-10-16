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
    return taxonomic_query(filter) | assembly_query(filter)


ALLOWED_FIELDS_MAP = {
    'taxid':'taxid',
    'organism_name':'organism_name',
    'database':'source_file_info.database',
    'assembly_accession':'assembly_accession',
    'assembly_name':'assembly_name',
    'feature_type':'features_summary.types',
    'feature_source':'features_summary.sources',
    'biotype':'features_summary.biotypes',
    'pipeline':'source_file_info.pipeline.name',
    'provider':'source_file_info.provider',
}

def get_frequencies(items:QuerySet, field:str):
    if not field or field not in ALLOWED_FIELDS_MAP:
        raise HTTPException(status_code=400, detail=f"Field parameter is required and must be one of: {', '.join(ALLOWED_FIELDS_MAP.keys())}")
    field = ALLOWED_FIELDS_MAP[field]
    try:

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
