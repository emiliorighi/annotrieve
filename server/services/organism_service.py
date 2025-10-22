from typing import Optional
from fastapi import HTTPException
from db.models import Organism
from helpers import response as response_helper, query_visitors as query_visitors_helper

def get_organisms(filter: str = None, offset: int = 0, limit: int = 20, taxids: Optional[str] = None, sort_by: str = None, sort_order: str = 'desc'):
    organisms = Organism.objects()
    if taxids:
        organisms = organisms.filter(taxon_lineage__in=taxids.split(',') if isinstance(taxids, str) else taxids)
    if filter:
        q_filter = query_visitors_helper.organism_query(filter) if filter else None
        organisms = organisms.filter(q_filter)
    if sort_by:
        sort = '-' + sort_by if sort_order == 'desc' else sort_by
        organisms = organisms.order_by(sort)
    return response_helper.json_response_with_pagination(organisms, organisms.count(), offset, limit)

def get_organism(taxid: str):
    organism = Organism.objects(taxid=taxid).exclude('id').first()
    if not organism:
        raise HTTPException(status_code=404, detail=f"Organism {taxid} not found")
    return organism