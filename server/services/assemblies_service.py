from fastapi import HTTPException
from db.models import GenomeAssembly, GenomicSequence
from helpers import response as response_helper, query_visitors as query_visitors_helper
from fastapi.responses import StreamingResponse
import io

def get_assemblies(filter: str = None, taxids: str = None, assembly_accessions: str = None, offset: int = 0, limit: int = 20, sort_by: str = None, sort_order: str = None, field: str = None, submitters: str = None, response_type: str = 'metadata'):
    try:
        print(f"field: {field}")
        print(f"response_type: {response_type}")
        query = {}
        if taxids:
            query['taxon_lineage__in'] = taxids.split(',') if isinstance(taxids, str) else taxids
        if assembly_accessions:
            query['assembly_accession__in'] = assembly_accessions.split(',') if isinstance(assembly_accessions, str) else assembly_accessions
        if submitters:
            query['submitter__in'] = [submitters]
        assemblies = GenomeAssembly.objects(**query)
        
        q_filter =  query_visitors_helper.assembly_query(filter) if filter else None
        if q_filter:
            assemblies = assemblies.filter(q_filter)
        if response_type == 'frequencies':
            if not field:
                raise HTTPException(status_code=400, detail=f"Field is required for frequencies response")
            return query_visitors_helper.get_frequencies(assemblies, field, type='assembly')

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

def get_chr_aliases_file(accession: str):    
    # Query chromosomes based on accession_version
    chromosomes = GenomicSequence.objects(assembly_accession=accession)
    if not chromosomes:
        raise HTTPException(status_code=404, detail=f"Assembly {accession} lacks chromosomes")
    
    #stream a tsv file with aliases fields in each line
    tsv_data = io.StringIO()
    for chromosome in chromosomes:
        aliases = "\t".join(chromosome.aliases)
        tsv_data.write(f"{chromosome.chr_name}\t{chromosome.sequence_name}\t{chromosome.genbank_accession}\t{chromosome.refseq_accession}\t{chromosome.ucsc_style_name}\t{aliases}\n")
    tsv_data.seek(0)
    return StreamingResponse(tsv_data, media_type='text/tab-separated-values', headers={
        "Content-Disposition": f'attachment; filename="{accession}_chr_aliases.tsv"',
        "Cache-Control": "public, max-age=86400",
        "X-Accel-Buffering": "no",
    })

