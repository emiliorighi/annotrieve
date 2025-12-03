

def raw_values_pipeline(field: str):
    return [
        {
            "$project": {
                "annotation_id": "$annotation_id",
                "value": f"${field}",
                "is_empty": {
                    "$or": [
                        {"$eq": [{"$ifNull": [f"${field}", None]}, None]},
                        {"$eq": [f"${field}", ""]},
                        {
                            "$and": [
                                {"$eq": [{"$type": f"${field}"}, "array"]},
                                {"$eq": [{"$size": f"${field}"}, 0]}
                            ]
                        }
                    ]
                }
            }
        },
        {
            "$facet": {
                "values": [
                    {
                        "$match": {
                            "is_empty": False
                        }
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "annotation_id": 1,
                            "value": 1
                        }
                    }
                ],
                "empty_annotations": [
                    {
                        "$match": {
                            "is_empty": True
                        }
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "annotation_id": 1
                        }
                    }
                ]
            }
        }
    ]


def category_stats_pipeline(category_name: str):
    return [
            {
                "$match": {
                    f"features_statistics.{category_name}.count": {"$exists": True, "$ne": None}
                }
            },
            {
                "$project": {
                    "count": f"$features_statistics.{category_name}.count",
                    "mean_length": f"$features_statistics.{category_name}.length_stats.mean",
                    "transcript_types": f"$features_statistics.{category_name}.transcripts.types"
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

def gene_category_metric_pipeline(metric: str):
    """
    Pipeline to extract raw values for a gene category metric.
    Metric can be: total_count, length_stats.min, length_stats.max, length_stats.mean
    """
    # Build the value extraction expression based on metric
    if metric == "total_count":
        value_field = "category_value.total_count"
    elif metric.startswith("length_stats."):
        sub_field = metric.split(".", 1)[1]  # e.g., "min", "max", "mean"
        value_field = f"category_value.length_stats.{sub_field}"
    else:
        value_field = f"category_value.{metric}"
    
    return [
        {
            "$match": {
                "features_statistics.gene_category_stats": {"$exists": True, "$ne": None}
            }
        },
        {
            "$project": {
                "annotation_id": "$annotation_id",
                "gene_categories": {"$objectToArray": "$features_statistics.gene_category_stats"}
            }
        },
        {
            "$unwind": "$gene_categories"
        },
        {
            "$project": {
                "annotation_id": "$annotation_id",
                "category": "$gene_categories.k",
                "category_value": "$gene_categories.v",
                "value": {"$ifNull": [f"${value_field}", None]}
            }
        },
        {
            "$project": {
                "annotation_id": "$annotation_id",
                "category": "$category",
                "value": "$value",
                "is_empty": {
                    "$or": [
                        {"$eq": ["$value", None]},
                        {"$eq": [{"$type": "$value"}, "missing"]}
                    ]
                }
            }
        },
        {
            "$facet": {
                "values": [
                    {
                        "$match": {
                            "is_empty": False
                        }
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "annotation_id": 1,
                            "category": 1,
                            "value": 1
                        }
                    }
                ],
                "empty_annotations": [
                    {
                        "$match": {
                            "is_empty": True
                        }
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "annotation_id": 1
                        }
                    }
                ]
            }
        }
    ]

def transcript_type_metric_pipeline(transcript_type: str, metric: str):
    """
    Pipeline to extract raw values for a transcript type metric.
    Metric can be: total_count, length_stats.min, length_stats.max, length_stats.mean,
    and nested fields from associated_genes, exon_stats, cds_stats
    """
    # Build the field path based on the metric
    base_path = f"features_statistics.transcript_type_stats.{transcript_type}"
    
    if metric == "total_count":
        field_path = f"{base_path}.total_count"
    elif metric.startswith("length_stats."):
        sub_field = metric.split(".", 1)[1]
        field_path = f"{base_path}.length_stats.{sub_field}"
    elif metric.startswith("associated_genes."):
        sub_field = metric.split(".", 1)[1]
        field_path = f"{base_path}.associated_genes.{sub_field}"
    elif metric.startswith("exon_stats."):
        sub_field = metric.split(".", 1)[1]
        # Handle nested fields like exon_stats.length.min
        if "." in sub_field:
            parts = sub_field.split(".", 1)
            field_path = f"{base_path}.exon_stats.{parts[0]}.{parts[1]}"
        else:
            field_path = f"{base_path}.exon_stats.{sub_field}"
    elif metric.startswith("cds_stats."):
        sub_field = metric.split(".", 1)[1]
        # Handle nested fields like cds_stats.length.min
        if "." in sub_field:
            parts = sub_field.split(".", 1)
            field_path = f"{base_path}.cds_stats.{parts[0]}.{parts[1]}"
        else:
            field_path = f"{base_path}.cds_stats.{sub_field}"
    else:
        field_path = f"{base_path}.{metric}"
    
    return [
        {
            "$match": {
                field_path: {"$exists": True, "$ne": None}
            }
        },
        {
            "$project": {
                "annotation_id": "$annotation_id",
                "value": f"${field_path}",
                "is_empty": {
                    "$or": [
                        {"$eq": [{"$ifNull": [f"${field_path}", None]}, None]},
                        {"$eq": [{"$type": f"${field_path}"}, "missing"]}
                    ]
                }
            }
        },
        {
            "$facet": {
                "values": [
                    {
                        "$match": {
                            "is_empty": False
                        }
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "annotation_id": 1,
                            "value": 1
                        }
                    }
                ],
                "empty_annotations": [
                    {
                        "$match": {
                            "is_empty": True
                        }
                    },
                    {
                        "$project": {
                            "_id": 0,
                            "annotation_id": 1
                        }
                    }
                ]
            }
        }
    ]