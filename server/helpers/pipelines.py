
def category_stats_pipeline(category_name: str):
    return [
            {
                "$project": {
                    "count": f"$features_statistics.{category_name}.count",
                    "mean_length": f"$features_statistics.{category_name}.length_stats.mean",
                    "transcript_types": f"$features_statistics.{category_name}.transcripts.types"
                }
            },
            {
                "$match": {
                    "count": {"$ne": None}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "counts": {"$push": "$count"},
                    "mean_lengths": {"$push": "$mean_length"},
                    "total_count": {"$sum": "$count"},
                    "avg_count": {"$avg": "$count"},
                    "avg_mean_length": {"$avg": "$mean_length"},
                    "transcript_types_array": {"$push": "$transcript_types"}
                }
            }
        ]

def feature_stats_pipeline(category_name: str, feature_name: str):
    return [
            {
                "$project": {
                    "mean_length": f"$features_statistics.{category_name}.features.{feature_name}.length_stats.mean"
                }
            },
            {
                "$match": {
                    "mean_length": {"$ne": None}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "mean_lengths": {"$push": "$mean_length"},
                    "avg_mean_length": {"$avg": "$mean_length"}
                }
            }
        ]