from typing import Optional
from db.models import TaxonNode
from helpers import response as response_helper, query_visitors as query_visitors_helper
from fastapi import HTTPException

def get_taxon_nodes(filter: str = None, offset: int = 0, limit: int = 20, taxids: Optional[str] = None):
    taxon_nodes = TaxonNode.objects()
    if taxids:
        taxon_nodes = taxon_nodes.filter(taxid__in=taxids.split(',') if isinstance(taxids, str) else taxids)
    if filter:
        q_filter = query_visitors_helper.taxon_query(filter) if filter else None
        taxon_nodes = taxon_nodes.filter(q_filter)
    taxon_nodes = taxon_nodes.exclude('id').skip(offset).limit(limit).as_pymongo()
    return response_helper.json_response_with_pagination(taxon_nodes, taxon_nodes.count(), offset, limit)

def get_taxon_node(taxid: str):
    taxon_node = TaxonNode.objects(taxid=taxid).exclude('id').first()
    if not taxon_node:
        raise HTTPException(status_code=404, detail=f"Taxon node {taxid} not found")
    return taxon_node

def get_taxon_node_children(taxid: str):
    taxon_node = get_taxon_node(taxid)
    children = TaxonNode.objects(taxid__in=taxon_node['children']).exclude('id').as_pymongo()
    return response_helper.json_response_with_pagination(children, children.count(), 0, len(children))

def get_ancestors(taxid: str):
    taxon = get_taxon_node(taxid)
    ancestors = [taxon.to_mongo().to_dict()]
    parent = TaxonNode.objects(children=taxid).exclude('id').first()
    while parent:
        ancestors.append(parent.to_mongo().to_dict())
        parent = TaxonNode.objects(children=parent.taxid).exclude('id').first()
    ancestors.reverse()
    return {
        "results": ancestors,
        "total": len(ancestors)
    }