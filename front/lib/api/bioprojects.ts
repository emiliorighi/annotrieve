import { apiGet, type Query } from './base'
import type { BioProjectRecord, Pagination } from './types'

export interface FetchBioprojectsParams extends Query {
  filter?: string
  limit?: number
  offset?: number
  sort_by?: string
  sort_order?: string
}

export function listBioprojects(params: FetchBioprojectsParams = {}) {
  return apiGet<Pagination<BioProjectRecord>>('/bioprojects', params)
}

export function getBioproject(accession: string) {
  return apiGet<BioProjectRecord>(`/bioprojects/${encodeURIComponent(accession)}`)
}


