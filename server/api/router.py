from fastapi import APIRouter
from api import annotations, assemblies, taxons, organisms, bioprojects

router = APIRouter()

router.include_router(annotations.router, tags=["annotations"]) 
router.include_router(assemblies.router, tags=["assemblies"])
router.include_router(taxons.router, tags=["taxons"])
router.include_router(organisms.router, tags=["organisms"])
router.include_router(bioprojects.router, tags=["bioprojects"])
