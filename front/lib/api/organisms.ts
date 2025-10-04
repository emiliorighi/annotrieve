import { apiGet, type Query } from './base'
import type { OrganismRecord, Pagination } from './types'

export interface FetchOrganismsParams extends Query {
  filter?: string
  taxids?: string
  limit?: number
  offset?: number
}

export function listOrganisms(params: FetchOrganismsParams) {
  return apiGet<Pagination<OrganismRecord>>('/organisms', params)
}

export function getOrganism(taxid: string) {
  return apiGet<OrganismRecord>(`/organisms/${encodeURIComponent(taxid)}`)
}
