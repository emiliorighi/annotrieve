from typing import Optional
from fastapi import HTTPException
from db.models import Organism
from helpers import response as response_helper, query_visitors as query_visitors_helper

def get_organisms(filter: str = None, offset: int = 0, limit: int = 20, taxids: Optional[str] = None):
    organisms = Organism.objects()
    if taxids:
        organisms = organisms.filter(taxid__in=taxids.split(',') if isinstance(taxids, str) else taxids)
    if filter:
        q_filter = query_visitors_helper.organism_query(filter) if filter else None
        organisms = organisms.filter(q_filter)
    return response_helper.json_response_with_pagination(organisms, organisms.count(), offset, limit)

def get_organism(taxid: str):
    organism = Organism.objects(taxid=taxid).exclude('id').first()
    if not organism:
        raise HTTPException(status_code=404, detail=f"Organism {taxid} not found")
    return organism