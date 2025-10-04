from server_refactor.helpers import data_helper
from server_refactor.db.models import MODEL_LIST

NO_VALUE_KEY = "no_value"

def get_stats(model, field, query):
    # Check if the model exists in MODEL_LIST
    if model not in MODEL_LIST:
        return {"message": "model not found"}, 404

    db_model = MODEL_LIST[model]
    parsed_query, q_query = data_helper.create_query(query, None)
    items = db_model.objects(**parsed_query)
    if q_query:
        items = items.filter(q_query)
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
        return data_helper.dump_json(sorted_response), 200

    except Exception as e:
        print(e)
        return {"message": str(e)}, 500