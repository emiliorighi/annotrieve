from fastapi import HTTPException
from db.models import BioProject
from helpers import response as response_helper, query_visitors as query_visitors_helper
import os
from jobs.updates import update_bioprojects


def get_bioprojects(filter: str = None, offset: int = 0, limit: int = 20, sort_by: str = None, sort_order: str = 'desc'):
    """
    Fetch BioProjects with optional filtering, sorting, and pagination.
    """
    bioprojects = BioProject.objects()
    if filter:
        bioprojects = bioprojects.filter(query_visitors_helper.bioproject_query(filter))
    if sort_by:
        sort = f"-{sort_by}" if sort_order == 'desc' else sort_by
        bioprojects = bioprojects.order_by(sort)
    bioprojects = bioprojects.exclude('id')
    total = bioprojects.count()
    return response_helper.json_response_with_pagination(bioprojects, total, offset, limit)


def get_bioproject(accession: str):
    """
    Fetch a single BioProject by accession.
    """
    bioproject = BioProject.objects(accession=accession).exclude('id').first()
    if not bioproject:
        raise HTTPException(status_code=404, detail=f"Bioproject {accession} not found")
    return bioproject


def trigger_bioprojects_update(auth_key: str):
    """
    Trigger the bioprojects update
    """
    if auth_key != os.getenv('AUTH_KEY'):
        raise HTTPException(status_code=401, detail="Unauthorized")
    update_bioprojects.delay()
    return {"message": "Bioprojects update task triggered"}