import os
from celery import shared_task
from db.models import GenomeAnnotation,  GenomicRegion, FeatureTypeStatsNode
from helpers.file import get_annotation_file_path
from helpers.genome_annotation import map_id_to_type, build_stats_and_type_relationships, insert_feature_type_stats, get_region_name
import pysam

ANNOTATIONS_PATH= os.getenv('LOCAL_ANNOTATION_PATH')

@shared_task(name='process_stats', ignore_result=False)
def process_stats():
    """
    Process hierarchy stats of annotations and genomic regions
    1. Get all annotations that are completed and not in the existing annotation hierarchy stats
    2. For each annotation, get all genomic regions that are in the GFF file
    3. For each genomic region, get the feature stats and save to the database
    """
    ## get parents
    existing_genomic_feature_counts = FeatureTypeStatsNode.objects.scalar('annotation_name')
    #get annotations that are completed and not in the existing annotation hierarchy stats
    annotations = GenomeAnnotation.objects(status='completed', name__nin=existing_genomic_feature_counts)
    
    print(f"Processing stats for a total of {annotations.count()} annotations")
    saved_regions = 0
    saved_feature_counts = 0

    if not annotations:
        print("No annotations to process")
        return
    
    #process annotations that are not in the existing annotation hierarchy stats
    for ann_to_process in annotations:
        print(f"Processing stats for {ann_to_process.name} of {ann_to_process.scientific_name}")
        #create annotation hierarchy stats
        file_path = get_annotation_file_path(ann_to_process)
        if not file_path or not os.path.exists(file_path):
            print(f"Annotation {ann_to_process.name} of {ann_to_process.scientific_name} has no file path or file does not exist")
            continue
        
        pysam_file = pysam.TabixFile(file_path)
        #get regions
        genomic_regions = GenomicRegion.objects(assembly_accession=ann_to_process.assembly_accession)
        gff_regions = pysam_file.contigs

        print(f"Processing stats for a total of {len(gff_regions)} genomic regions")
        for genomic_region in genomic_regions:
            saved_nodes = process_region_stats(pysam_file, gff_regions, genomic_region, ann_to_process)
            if saved_nodes:
                saved_feature_counts += saved_nodes
                saved_regions += 1

    print(f"Saved stats for {saved_regions} genomic regions and {saved_feature_counts} genomic feature counts")

def process_region_stats(pysam_file, gff_regions, genomic_region, ann_to_process):
    """
    Process the stats for a specific region of an annotation
    """
    region_name = get_region_name(genomic_region, gff_regions)
    if not region_name:
        print(f"Region {genomic_region.name} of {ann_to_process.scientific_name} not found in GFF file")
        return 
    
    print(f"Processing stats for {region_name} of {ann_to_process.scientific_name}")
    try:

    # Pass 1: build id → type map
        id_to_type = map_id_to_type(pysam_file, region_name)

        print(f"Building stats and type relationships for {region_name} of {ann_to_process.scientific_name}")
        # Pass 2: build stats and type relationships
        type_stats, parent_types, child_types = build_stats_and_type_relationships(pysam_file, region_name, id_to_type)
        
        print(f"Inserting feature type stats for {region_name} of {ann_to_process.scientific_name}")
        # Save to Mongo
        saved_nodes = insert_feature_type_stats(type_stats, parent_types, child_types, ann_to_process, region_name, genomic_region.insdc_accession)
        print(f"Saved {saved_nodes} feature type stats for {region_name} of {ann_to_process.scientific_name}")
        return saved_nodes
    except Exception as e:
        print(f"Error processing stats for {region_name} of {ann_to_process.scientific_name}: {e}")
        return 0