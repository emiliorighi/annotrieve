from .organism import organisms_controller
from .annotation import annotations_controller
from .assembly import assemblies_controller
from .taxon import taxons_controller
from .taxonomy import taxonomy_controller
from .stats import stats_controller
from .lookup import lookup_controller
from .job import jobs_controller

def initialize_routes(api):

    #SPECIES
    api.add_resource(organisms_controller.OrganismsApi, '/api/species')
    api.add_resource(organisms_controller.OrganismApi, '/api/species/<taxid>')
    api.add_resource(organisms_controller.OrganismLineageApi, '/api/species/<taxid>/lineage')
    api.add_resource(organisms_controller.OrganismRelatedDataApi, '/api/species/<taxid>/<model>')

	##ASSEMBLY
    api.add_resource(assemblies_controller.AssembliesApi, '/api/assemblies')
    api.add_resource(assemblies_controller.AssemblyApi,  '/api/assemblies/<accession>')
    api.add_resource(lookup_controller.AssemblyRelatedDataLookup,  '/api/assemblies/<accession>/lookup')
    api.add_resource(assemblies_controller.AssemblyRelatedAnnotationsApi, '/api/assemblies/<accession>/annotations')
    api.add_resource(assemblies_controller.AssembliesRelatedChromosomesApi, '/api/assemblies/<accession>/chromosomes')
    api.add_resource(assemblies_controller.AssemblyChrAliasesApi, '/api/assemblies/<accession>/chr_aliases')

	##ANNOTATIONS
    api.add_resource(annotations_controller.AnnotationsApi, '/api/annotations')
    api.add_resource(annotations_controller.AnnotationApi,  '/api/annotations/<name>')
    api.add_resource(annotations_controller.StreamAnnotations, '/api/download/<filename>')

	##TAXONS
    api.add_resource(taxons_controller.TaxonsApi, '/api/taxons')
    api.add_resource(taxons_controller.TaxonApi, '/api/taxons/<taxid>')
    api.add_resource(lookup_controller.TaxonRelatedDataLookup, '/api/taxons/<taxid>/stats')
    api.add_resource(taxons_controller.TaxonChildrenApi, '/api/taxons/<taxid>/children')

    ##DATA LOOKUP
    api.add_resource(lookup_controller.LookupApi, '/api/lookup')

    ##STATS
    api.add_resource(stats_controller.FieldStatsApi, '/api/stats/<model>/<field>')

    ##TAXONOMY
    api.add_resource(taxonomy_controller.RootTreeApi, '/api/tree')

    #JOBS
    api.add_resource(jobs_controller.UploadAnnotationsAPI, '/api/jobs/import_annotations')
    api.add_resource(jobs_controller.ProcessAnnotations, '/api/jobs/process_gffs')
    api.add_resource(jobs_controller.ComputeTree, '/api/jobs/compute_tree')
