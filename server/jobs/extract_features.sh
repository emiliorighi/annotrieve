#!/bin/bash

# Check for input arguments
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <gff_file> <genome_size_in_bp>"
    exit 1
fi

# Input arguments
gff_file="$1"
genome_size_bp="$2"

# Convert genome size to megabases (Mb)
genome_size_mb=$(echo "scale=2; $genome_size_bp / 1000000" | bc)

# Function to calculate feature stats
calculate_feature_stats() {
    awk -F'\t' '!/^#/ {
        feature_type = $3
        start = $4
        end = $5
        feature_length = end - start + 1

        # Increment the count and total length for this feature type
        count[feature_type]++
        total_length[feature_type] += feature_length
    } END {
       
        # Print the header inside awk
        print "Feature,Features_Count,Total_Feature_length,Average_Feature_Length,Feature_Density_ftMb"
        
        # Print the results for each feature type in a single line, comma-separated
        for (feature in count) {
            avg_length = total_length[feature] / count[feature]
            feature_density_ftMb = count[feature] / '"$genome_size_mb"'
            
            # Print in CSV format: Feature, Total Features, Average Feature Length, Feature Density
            printf "%s,%d,%d,%.2f,%.2f\n", feature, count[feature], total_length[feature], avg_length, feature_density_ftMb
        }
    }'
}

# Check if the input file is gzipped
if [[ "$gff_file" == *.gz ]]; then
    gunzip -c "$gff_file" | calculate_feature_stats
else
    calculate_feature_stats < "$gff_file"
fi
