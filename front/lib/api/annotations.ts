import { apiGet, type Query } from './base'
import type { AnnotationRecord, Pagination } from './types'

export interface FetchAnnotationsParams extends Query {
  filter?: string
  taxids?: string
  sources?: string
  assembly_accessions?: string
  sort_by?: 'assembly_accession' | 'assembly_name' | 'organism_name' | 'release_date'
  sort_order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export function listAnnotations(params: FetchAnnotationsParams) {
  return apiGet<Pagination<AnnotationRecord>>('/annotations', params)
}

export function getAnnotation(md5: string) {
  return apiGet<AnnotationRecord>(`/annotations/${md5}`)
}

export function getAnnotationsStats(field: string, params?: Query) {
  return apiGet<Record<string, number>>(`/annotations/stats/${encodeURIComponent(field)}`, params)
}

export function listAnnotationErrors(offset = 0, limit = 20) {
  return apiGet<Pagination<any>>('/annotations/errors', { offset, limit })
}
