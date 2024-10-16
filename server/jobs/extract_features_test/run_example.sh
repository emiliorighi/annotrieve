#!/bin/bash

for ann in $(realpath input_ann/*[.gff,.gz])
do
    name=$(basename $ann)
    echo $ann
    bash ../extract_features.sh $ann 775535542 > output_stats/$name'.stats'
done
