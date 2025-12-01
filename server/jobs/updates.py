from celery import shared_task
from db.models import GenomeAssembly, GenomeAnnotation, AnnotationSequenceMap, BioProject
from clients import ncbi_datasets as ncbi_datasets_client
import os
from .services import assembly as assembly_service
from .services.utils import create_batches
from .services import stats as stats_service
from .services import feature_stats as feature_stats_service
from helpers import file as file_helper

TMP_DIR = "/tmp"

@shared_task(name='update_assembly_fields', ignore_result=False)
def update_assembly_fields():
    """
    Update the fields for the assemblies
    """
    pass


@shared_task(name='update_feature_stats', ignore_result=False)
def update_feature_stats():
    """
    Update the feature stats for the annotations
    """
    annotations = GenomeAnnotation.objects()
    for annotation in annotations:
        #get full bgzipped path from the indexed file info
        bgzipped_path = file_helper.get_annotation_file_path(annotation)
        feature_stats = feature_stats_service.compute_features_statistics(bgzipped_path)
        #for the moment we keep the old fields for backwards compatibility
        if annotation.features_statistics:
            annotation.features_statistics.gene_category_stats = feature_stats.gene_category_stats
            annotation.features_statistics.transcript_type_stats = feature_stats.transcript_type_stats
            annotation.save()
        else:
            annotation.features_statistics = feature_stats
            annotation.save()

@shared_task(name='update_bioprojects', ignore_result=False)
def update_bioprojects():
    """
    Import the bioprojects and update assemblies and annotations
    """
    accessions = GenomeAssembly.objects().scalar('assembly_accession')
    batches = create_batches(accessions, 5000)
    files_to_delete = []
    all_bp_accessions = set()
    bioprojects_to_save = dict() #accession: BioProject to ensure we don't save the same bioproject multiple times
    assembly_to_bp_accessions = dict() #assembly_accession: list[bioproject_accessions]
    for idx, accessions_batch in enumerate(batches):
        assemblies_path = os.path.join(TMP_DIR, f'assemblies_to_update_{idx}_{len(accessions_batch)}.txt')
        files_to_delete.append(assemblies_path)
        with open(assemblies_path, 'w') as f:
            for accession in accessions_batch: 
                f.write(accession + '\n')
        cmd = ['genome', 'accession', '--inputfile', assemblies_path]
        ncbi_report = ncbi_datasets_client.get_data_from_ncbi(cmd)
        report = ncbi_report.get('reports', [])    
        if not report:
            print(f"No report found for {assemblies_path}")
        for assembly in report:
            assembly_accession = assembly.get('accession')
            bioproject_accessions = assembly_service.parse_bioprojects(assembly.get('assembly_info', {}), bioprojects_to_save)
            assembly_to_bp_accessions[assembly_accession] = bioproject_accessions
            all_bp_accessions.update(bioproject_accessions)
    
    #filter out existing bioprojects
    existing_bioprojects = BioProject.objects(accession__in=list(all_bp_accessions)).scalar('accession')
    new_bioprojects = all_bp_accessions - set(existing_bioprojects)
    bioprojects_to_save = {accession: bioproject for accession, bioproject in bioprojects_to_save.items() if accession in new_bioprojects}
    #insert the bioprojects to the database
    if not new_bioprojects:
        print("No new bioprojects to insert")
        return
    try:
        BioProject.objects.insert(list(bioprojects_to_save.values()))
        for assembly_accession, bioproject_accessions in assembly_to_bp_accessions.items():
            GenomeAssembly.objects(assembly_accession=assembly_accession).update(bioprojects=bioproject_accessions)
        print(f"Updated {len(assembly_to_bp_accessions)} assemblies with new bioprojects")
    #update Bioprojects counts
    except Exception as e:
        print(f"Error inserting bioprojects: {e}")
        raise e
    finally:
        #delete the tmp files
        for file_to_delete in files_to_delete:
            os.remove(file_to_delete)
        print("Updated bioprojects")


@shared_task(name='update_annotation_fields', ignore_result=False)
def update_annotation_fields():
    """
    Update the fields for the annotations
    """
    annotations = GenomeAnnotation.objects()
    for annotation in annotations:
        mapped_regions = AnnotationSequenceMap.objects(annotation_id=annotation.annotation_id).scalar('sequence_id')
        if not mapped_regions:
            continue
        annotation.modify(mapped_regions=mapped_regions)



@shared_task(name='ensure_indexes', ignore_result=False)
def ensure_indexes():
    """
    Ensure the indexes are created
    """
    for doc in [GenomeAnnotation, GenomeAssembly]:
        doc.ensure_indexes()
