from db.models import GenomeAssembly, GenomeAnnotation, Organism, TaxonNode

def update_db_stats():
    """
    Update the db stats
    """
    #update annotations count for assemblies
    assemblies_to_update = GenomeAssembly.objects()
    for assembly in assemblies_to_update:
        assembly.modify(
            annotations_count=GenomeAnnotation.objects(assembly_accession=assembly.assembly_accession).count()
        )

    #update annotations count and assemblies count for organisms
    organisms_to_update = Organism.objects()
    for organism in organisms_to_update:
        organism.modify(
            annotations_count=GenomeAnnotation.objects(taxid=organism.taxid).count(),\
            assemblies_count=GenomeAssembly.objects(taxid=organism.taxid).count()
        )

    #update annotations count, assemblies count and organisms count for taxon nodes
    taxon_nodes_to_update = TaxonNode.objects()
    for taxon_node in taxon_nodes_to_update:
        taxon_node.modify(
            annotations_count=GenomeAnnotation.objects(taxid__in=taxon_node.taxon_lineage).count(), \
            assemblies_count=GenomeAssembly.objects(taxid__in=taxon_node.taxon_lineage).count(),\
            organisms_count=Organism.objects(taxid__in=taxon_node.taxon_lineage).count()
        )

def clean_up_empty_models():
    """
    Clean up empty models where annotations_count is 0
    """
    GenomeAssembly.objects(annotations_count=0).delete()
    Organism.objects(annotations_count=0).delete()
    TaxonNode.objects(annotations_count=0).delete()

    #update counts on organisms and taxon nodes after deleting empty models