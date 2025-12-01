from typing import Optional
from fastapi import APIRouter, Body, Depends
from services import bioproject_service


router = APIRouter()


class CommonQueryParams:
    def __init__(
        self,
        filter: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = 'desc',
    ):
        self.filter = filter
        self.offset = offset
        self.limit = limit
        self.sort_by = sort_by
        self.sort_order = sort_order


@router.get("/bioprojects")
@router.post("/bioprojects")
def get_bioprojects(commons: CommonQueryParams = Depends(), payload: Optional[dict] = Body(None)):
    """
    Retrieve BioProjects with optional filtering, sorting, and pagination.
    """
    params = payload if payload else commons.__dict__
    return bioproject_service.get_bioprojects(**params)


@router.get("/bioprojects/{accession}")
def get_bioproject(accession: str):
    """
    Retrieve a single BioProject by accession.
    """
    return bioproject_service.get_bioproject(accession).to_mongo().to_dict()


@router.get("/bioprojects/update/{auth_key}")
async def update_bioprojects(auth_key: str):
    return bioproject_service.trigger_bioprojects_update(auth_key)

