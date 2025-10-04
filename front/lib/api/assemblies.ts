import { apiGet, type Query } from './base'
import type { AssemblyRecord, Pagination } from './types'

export interface FetchAssembliesParams extends Query {
  filter?: string
  taxids?: string
  sources?: string
  names?: string
  assembly_accessions?: string
  limit?: number
  offset?: number
}

export function listAssemblies(params: FetchAssembliesParams) {
  return apiGet<Pagination<AssemblyRecord>>('/assemblies', params)
}

export function getAssembly(accession: string) {
  return apiGet<AssemblyRecord>(`/assemblies/${encodeURIComponent(accession)}`)
}

export function getAssembledMolecules(accession: string, offset = 0, limit = 20) {
  return apiGet<Pagination<any>>(`/assemblies/${encodeURIComponent(accession)}/assembled_molecules`, { offset, limit })
}

export function getPairedAssembly(accession: string) {
  return apiGet<AssemblyRecord>(`/assemblies/${encodeURIComponent(accession)}/paired`)
}
