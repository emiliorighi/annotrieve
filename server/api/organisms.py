from typing import Optional
from fastapi import APIRouter, Depends, Body
from services import organism_service

router = APIRouter()

class CommonQueryParams:
    def __init__(
        self,
        filter: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
        taxids: Optional[str] = None,
    ):
        self.filter = filter
        self.offset = offset
        self.limit = limit
        self.taxids = taxids

@router.get("/organisms")
@router.post("/organisms")
def get_organisms(commons: CommonQueryParams = Depends(), payload: Optional[dict] = Body(None)):
    """
    Get a list of organisms with optional filtering and pagination
    """
    if payload:
        params = payload
    else:
        params = commons.__dict__
    return organism_service.get_organisms(**params)

@router.get("/organisms/{taxid}")
def get_organism(taxid: str):
    """
    Get a single organism by taxid
    """
    return organism_service.get_organism(taxid).to_mongo().to_dict()
