from db.models import GenomeAssembly, GenomeAnnotation, Organism, TaxonNode
from itertools import chain

def update_db_stats(saved_annotations: list[GenomeAnnotation]):
    """
    Update the db stats
    """
    accessions_to_update = set(ann.assembly_accession for ann in saved_annotations)
    organisms_to_update = set(ann.taxid for ann in saved_annotations)
    taxons_to_update = set(chain(*[ann.taxon_lineage for ann in saved_annotations]))
   
    print(f"Updating stats for {len(accessions_to_update)} assemblies, {len(organisms_to_update)} organisms, {len(taxons_to_update)} taxons")
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

def clean_up_empty_models():
    """
    Clean up empty models where annotations_count is 0
    """
    GenomeAssembly.objects(annotations_count=0).delete()
    Organism.objects(annotations_count=0).delete()
    TaxonNode.objects(annotations_count=0).delete()

    #update counts on organisms and taxon nodes after deleting empty models