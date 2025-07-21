from helpers import mappers as mappers_helper, query as query_helper, response as response_helper
from db.models import FeatureTypeStatsNode

def get_instance_stats():
    response = {}
    for k,v in mappers_helper.MODEL_MAPPERS.items():
        counts = v['model'].objects().count()
        response[k] = counts
    return response_helper.dump_json(response)

def get_model_fields(model):
    if model not in mappers_helper.MODEL_MAPPERS:
        return {"message": "model not found"}, 404
    fields = mappers_helper.MODEL_MAPPERS[model]['tsv_fields']
    return response_helper.dump_json(fields)

def get_stats(model, field, query):
    print(FeatureTypeStatsNode.objects(feature_type='transcript').to_json())

    if model not in mappers_helper.MODEL_MAPPERS:
        return {"message": "model not found"}, 404

    db_model = mappers_helper.MODEL_MAPPERS[model]['model']
    parsed_query, q_query = query_helper.create_query(query, None)
    items = db_model.objects(**parsed_query)
    if q_query:
        items = items.filter(q_query)
    try:
        pipeline = [
            {
                "$project": {
                    "field_value": {
                        "$ifNull": [f"${field}", "No Value"]
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
            doc["_id"]: doc["count"]
            for doc in items.aggregate(pipeline)
        }
        # Sort the response dictionary
        sorted_response = {key : response[key] for key in sorted(response)}
        return response_helper.dump_json(sorted_response), 200

    except Exception as e:
        print(e)
        return {"message": str(e)}, 500