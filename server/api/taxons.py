from fastapi import APIRouter, Depends, Body
from typing import Optional
from services import taxonomy_service   

router = APIRouter()

class CommonQueryParams:
    def __init__(
        self,
        filter: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
        taxids: Optional[str] = None,
        rank: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = None,
    ):
        self.filter = filter
        self.offset = offset
        self.limit = limit
        self.taxids = taxids
        self.rank = rank
        self.sort_by = sort_by
        self.sort_order = sort_order
        
@router.get("/taxons")
@router.post("/taxons")
async def get_taxons(commons: CommonQueryParams = Depends(), payload: Optional[dict] = Body(None)):
    if payload:
        params = payload
    else:
        params = commons.__dict__
    return taxonomy_service.get_taxon_nodes(**params)

@router.get("/taxons/{taxid}")
async def get_taxon(taxid: str):
    return taxonomy_service.get_taxon_node(taxid).to_mongo().to_dict()

@router.get("/taxons/{taxid}/children")
async def get_taxon_children(taxid: str):
    return taxonomy_service.get_taxon_node_children(taxid)

@router.get("/taxons/{taxid}/ancestors")
async def get_taxon_ancestors(taxid: str):
    return taxonomy_service.get_ancestors(taxid)