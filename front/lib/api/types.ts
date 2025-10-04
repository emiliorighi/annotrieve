export interface Pagination<T> {
  total: number
  offset: number
  limit: number
  results: T[]
}

export interface AnnotationRecord {
  md5_checksum?: string
  name?: string
  organism_name?: string
  assembly_accession?: string
  assembly_name?: string
  taxid?: string
  source?: string
  [key: string]: unknown
}

export interface OrganismRecord {
  taxid: string
  organism_name?: string
  common_name?: string
  annotations_count?: number
  assemblies_count?: number
  [key: string]: unknown
}

export interface AssemblyRecord {
  assembly_accession: string
  assembly_name: string
  organism_name: string
  taxid: string
  annotations_count?: number
  
  [key: string]: unknown
}

export interface TaxonRecord {
  taxid: string
  scientific_name?: string
  rank?: string
  organisms_count?: number
  annotations_count?: number
  assemblies_count?: number
  children?: TaxonRecord[]
  [key: string]: unknown
}
