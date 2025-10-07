import { apiGet, type Query } from './base'
import type { TaxonRecord, Pagination } from './types'

export interface FetchTaxonsParams extends Query {
  filter?: string
  taxids?: string
  limit?: number
  offset?: number
}

export function listTaxons(params: FetchTaxonsParams) {
  return apiGet<Pagination<TaxonRecord>>('/taxons', params)
}

export function getTaxon(taxid: string) {
  return apiGet<TaxonRecord>(`/taxons/${encodeURIComponent(taxid)}`)
}

export function getTaxonChildren(taxid: string) {
  return apiGet<Pagination<TaxonRecord>>(`/taxons/${encodeURIComponent(taxid)}/children`)
}

export function getTaxonAncestors(taxid: string) {
  return apiGet<Pagination<TaxonRecord>>(`/taxons/${encodeURIComponent(taxid)}/ancestors`)
}