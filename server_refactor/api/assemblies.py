from fastapi import APIRouter, Depends, Body
from typing import Optional
from services import assemblies_service

router = APIRouter()

class CommonQueryParams:
    def __init__(
        self,
        filter: Optional[str] = None,
        taxids: Optional[str] = None,
        assembly_accessions: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ):
        self.filter = filter
        self.taxids = taxids
        self.assembly_accessions = assembly_accessions
        self.offset = offset
        self.limit = limit

@router.get("/assemblies")
@router.post("/assemblies")
async def get_assemblies(commons: CommonQueryParams = Depends(), payload: Optional[dict] = Body(None)):
    if payload:
        params = payload
    else:
        params = commons.__dict__
    return assemblies_service.get_assemblies(**params)

@router.get("/assemblies/{assembly_accession}")
async def get_assembly(assembly_accession: str):
    return assemblies_service.get_assembly(assembly_accession)

@router.get("/assemblies/{assembly_accession}/assembled-molecules")
async def get_assembled_molecules(assembly_accession: str, offset: int = 0, limit: int = 20):
    return assemblies_service.get_assembled_molecules(assembly_accession, offset, limit)

@router.get("/assemblies/{assembly_accession}/paired-assembly")
async def get_paired_assembly(assembly_accession: str):
    return assemblies_service.get_paired_assembly(assembly_accession)