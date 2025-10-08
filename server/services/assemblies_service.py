from fastapi import HTTPException
from db.models import GenomeAssembly, GenomicSequence
from helpers import response as response_helper, query_visitors as query_visitors_helper
import os
from jobs.update_assemblies import update_fields

def get_assemblies(filter: str = None, taxids: str = None, assembly_accessions: str = None, offset: int = 0, limit: int = 20, sort_by: str = None, sort_order: str = None, field: str = None, submitters: str = None, response_type: str = 'metadata'):
    try:
        query = {}
        if taxids:
            query['taxon_lineage__in'] = taxids.split(',') if isinstance(taxids, str) else taxids
        if assembly_accessions:
            query['assembly_accession__in'] = assembly_accessions.split(',') if isinstance(assembly_accessions, str) else assembly_accessions
        if submitters:
            query['submitter__in'] = [submitters]
        print(query)
        assemblies = GenomeAssembly.objects(**query)
        
        q_filter =  query_visitors_helper.assembly_query(filter) if filter else None
        if q_filter:
            assemblies = assemblies.filter(q_filter)
        if field and response_type == 'stats':
            return query_visitors_helper.get_stats(assemblies, field)

        if sort_by:
            sort = '-' + sort_by if sort_order == 'desc' else sort_by
            assemblies = assemblies.order_by(sort)

        return response_helper.json_response_with_pagination(assemblies, assemblies.count(), offset, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching assemblies: {e}")

def get_assembly(assembly_accession: str):
    assembly = GenomeAssembly.objects(assembly_accession=assembly_accession).exclude('id').first()
    if not assembly:
        raise HTTPException(status_code=404, detail=f"Assembly {assembly_accession} not found")
    return assembly

def get_assembled_molecules(assembly_accession: str, offset: int = 0, limit: int = 20):
    genomic_sequences = GenomicSequence.objects(assembly_accession=assembly_accession).exclude('id').skip(offset).limit(limit).as_pymongo()
    return response_helper.json_response_with_pagination(genomic_sequences, genomic_sequences.count(), offset, limit)

def get_paired_assembly(assembly_accession: str):
    assembly = get_assembly(assembly_accession)
    paired_assembly_accession = assembly.paired_assembly_accession
    if not paired_assembly_accession:
        raise HTTPException(status_code=404, detail=f"Assembly {assembly_accession} is not a paired assembly")
    return get_assembly(paired_assembly_accession)

def trigger_update_release_date(auth_key: str):
    if auth_key != os.getenv('AUTH_KEY'):
        raise HTTPException(status_code=401, detail="Invalid auth key")
    update_fields.delay()
    return response_helper.json_response(message="Update release date job triggered")   