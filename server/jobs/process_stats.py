import os
from celery import shared_task
from db.models import GenomeAnnotation,  GenomicRegion, RegionFeatureTypeStats, ParentFeatureTypeStats
from helpers.file import get_annotation_file_path
from helpers.genomic_regions import get_region_name
from helpers.feature_type_stats import map_id_to_type_and_global_stats, build_type_stats_by_parent, calculate_stats_by_parent
import pysam

ANNOTATIONS_PATH= os.getenv('LOCAL_ANNOTATIONS_DIR')

@shared_task(name='process_stats', ignore_result=False)
def process_stats():
    """
    Process hierarchy stats of annotations and genomic regions
    1. Get all annotations that are completed and not in the existing annotation hierarchy stats
    2. For each annotation, get all genomic regions that are in the GFF file
    3. For each genomic region, get the feature stats and save to the database
    """
    #get annotations that are bgzip_tabix
    annotations = GenomeAnnotation.objects(status='bgzip_tabix')
    
    print(f"Processing stats for a total of {annotations.count()} annotations")

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
            process_region_stats(pysam_file, gff_regions, genomic_region, ann_to_process)

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
        print(f"Building global type stats for {region_name} of {ann_to_process.scientific_name}")
        id_to_type, global_type_stats = map_id_to_type_and_global_stats(pysam_file, region_name)
        print(f"Global type stats to save: {len(global_type_stats)}")
        RegionFeatureTypeStats.objects.insert(global_type_stats)
        ann_to_process.update(status='global_stats')
        print(f"Saved {len(global_type_stats)} global type stats for {region_name} of {ann_to_process.scientific_name}")
        # Pass 2: build stats and type relationships
        print(f"Building type stats by parent for {region_name} of {ann_to_process.scientific_name}")
        type_stats_by_parent = build_type_stats_by_parent(pysam_file, region_name, id_to_type)

        # Pass 3: calculate stats by parent
        stats_by_parent = calculate_stats_by_parent(type_stats_by_parent, ann_to_process.name, region_name, genomic_region.insdc_accession)
        print(f"Stats by parent to save: {len(stats_by_parent)}")
        ParentFeatureTypeStats.objects.insert(stats_by_parent)
        ann_to_process.update(status='feature_stats')
        print(f"Saved {len(stats_by_parent)} stats by parent for {region_name} of {ann_to_process.scientific_name}")
    except Exception as e:
        print(f"Error processing stats for {region_name} of {ann_to_process.scientific_name}: {e}")
