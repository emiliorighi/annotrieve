from fastapi import APIRouter, Depends, Body
from typing import Optional, Dict, Any
from services import assemblies_service
from helpers import parameters as params_helper

router = APIRouter()

@router.get("/assemblies")
@router.post("/assemblies")
async def get_assemblies(commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
    params = params_helper.handle_request_params(commons, payload)
    return assemblies_service.get_assemblies(**params)

@router.get("/assemblies/stats/{field}")
@router.post("/assemblies/stats/{field}")
async def get_assemblies_stats(field: str, commons: Dict[str, Any] = Depends(params_helper.common_params), payload: Optional[Dict[str, Any]] = Body(None)):
    params = params_helper.handle_request_params(commons, payload)
    return assemblies_service.get_assemblies(**params, field=field, response_type='stats')

@router.get("/assemblies/{assembly_accession}")
async def get_assembly(assembly_accession: str):
    return assemblies_service.get_assembly(assembly_accession).to_mongo().to_dict()

@router.get("/assemblies/{assembly_accession}/chr_aliases")
async def get_chr_aliases(assembly_accession: str):
    return assemblies_service.get_chr_aliases_file(assembly_accession)

@router.get("/assemblies/{assembly_accession}/assembled_molecules")
async def get_assembled_molecules(assembly_accession: str, offset: int = 0, limit: int = 20):
    return assemblies_service.get_assembled_molecules(assembly_accession, offset, limit)

@router.get("/assemblies/{assembly_accession}/paired") 
async def get_paired_assembly(assembly_accession: str):
    return assemblies_service.get_paired_assembly(assembly_accession).to_mongo().to_dict()
