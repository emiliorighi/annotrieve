import { apiGet, apiPost, type Query } from './base'
import type { AnnotationRecord, Pagination } from './types'

export interface FetchAnnotationsParams extends Query {
  filter?: string
  taxids?: string
  sources?: string
  assembly_accessions?: string
  sort_by?: 'assembly_accession' | 'assembly_name' | 'organism_name' | 'source_file_info.release_date'
  sort_order?: 'asc' | 'desc'
  latest_release_by?: 'organism' | 'assembly'
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

export function getAnnotationsStatsSummary(params?: Query) {
  return apiGet<any>('/annotations/stats/summary', params)
}

export function getAnnotationsFrequencies(field: string, params?: Query) {
  return apiGet<Record<string, number>>(`/annotations/frequencies/${encodeURIComponent(field)}`, params)
}

export function listAnnotationErrors(offset = 0, limit = 20) {
  return apiGet<Pagination<any>>('/annotations/errors', { offset, limit })
}

export function downloadAnnotations(md5_checksums: string[]) {
  return apiPost<Blob>('/annotations/download', { md5_checksums }, {}, {}, 'blob')
}