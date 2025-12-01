from db.models import GenomeAssembly, GenomeAnnotation, Organism, TaxonNode, BioProject
from itertools import chain
from mongoengine.queryset.visitor import Q


def update_db_stats(saved_annotations_ids: list[str]):
    """
    Update the db stats, given a list of annotations ids 
    """
    accessions_to_update = set(GenomeAnnotation.objects(annotation_id__in=saved_annotations_ids).scalar('assembly_accession'))
    organisms_to_update = set(GenomeAnnotation.objects(annotation_id__in=saved_annotations_ids).scalar('taxid'))
    taxon_lineages = GenomeAnnotation.objects(annotation_id__in=saved_annotations_ids).scalar('taxon_lineage')
    taxons_to_update = set(chain(*[list(lineage) if lineage else [] for lineage in taxon_lineages]))
    related_bioprojects = GenomeAssembly.objects(assembly_accession__in=list(accessions_to_update)).scalar('bioprojects')
    bioproject_accessions_to_update = set(chain(*[list(bp_list) if bp_list else [] for bp_list in related_bioprojects]))
    print(f"Updating stats for {len(accessions_to_update)} assemblies, {len(organisms_to_update)} organisms, {len(taxons_to_update)} taxons, {len(bioproject_accessions_to_update)} bioprojects")
    #update annotations count for assemblies
    for assembly in GenomeAssembly.objects(assembly_accession__in=list(accessions_to_update)):
        assembly.modify(
            annotations_count=GenomeAnnotation.objects(assembly_accession=assembly.assembly_accession).count()
        )

    #update annotations count and assemblies count for organisms
    for organism in Organism.objects(taxid__in=list(organisms_to_update)):
        organism.modify(
            annotations_count=GenomeAnnotation.objects(taxid=organism.taxid).count(),\
            assemblies_count=GenomeAssembly.objects(taxid=organism.taxid).count()
        )

    #update annotations count, assemblies count and organisms count for taxon nodes
    for taxon_node in TaxonNode.objects(taxid__in=list(taxons_to_update)):
        annotations_count = GenomeAnnotation.objects(taxon_lineage__in=[taxon_node.taxid]).count()
        assemblies_count = GenomeAssembly.objects(taxon_lineage__in=[taxon_node.taxid]).count()
        organisms_count = Organism.objects(taxon_lineage__in=[taxon_node.taxid]).count()
        taxon_node.modify(
            annotations_count=annotations_count, \
            assemblies_count=assemblies_count, \
            organisms_count=organisms_count
        )
    #update assemblies count for bioprojects
    for bioproject in BioProject.objects(accession__in=list(bioproject_accessions_to_update)):
        bioproject.modify(
            assemblies_count=GenomeAssembly.objects(bioprojects__in=[bioproject.accession]).count()
        )

def clean_up_empty_models():
    """
    Clean up empty models where annotations_count is 0
    """
    annotation_q = Q(annotations_count=0) | Q(annotations_count__exists=False)
    deleted_assemblies_count = GenomeAssembly.objects(annotation_q).delete()
    deleted_organisms_count = Organism.objects(annotation_q).delete()
    deleted_taxon_nodes_count = TaxonNode.objects(annotation_q).delete()
    assembly_q = Q(assemblies_count=0) | Q(assemblies_count__exists=False)
    deleted_bioprojects_count = BioProject.objects(assembly_q).delete()
    print(f"Deleted {deleted_assemblies_count} assemblies, {deleted_organisms_count} organisms, {deleted_taxon_nodes_count} taxon nodes, {deleted_bioprojects_count} bioprojects")

