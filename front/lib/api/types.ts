export interface SourceFileInfo {
  database: string
  provider: string
  release_date: string
  last_modified: string
  uncompressed_md5: string
}

export interface AssemblyStats {
  total_number_of_chromosomes: number
  total_sequence_length: string
  total_ungapped_length: string
  number_of_contigs: number
  contig_n50: number
  contig_l50: number
  number_of_scaffolds: number
  scaffold_n50: number
  scaffold_l50: number
  gaps_between_scaffolds_count: number
  number_of_component_sequences: number
  atgc_count: string
  gc_count: string
  gc_percent: number
  genome_coverage: string
  number_of_organelles: number
  number_of_plasmids: number
  number_of_chloroplasts: number
  number_of_mitochondria: number
}

export interface Pagination<T> {
  total: number
  offset: number
  limit: number
  results: T[]
}

export interface AnnotationRecord {
  md5_checksum?: string
  annotation_id: string
  name?: string
  organism_name?: string
  assembly_accession?: string
  assembly_name?: string
  taxid?: string
  source_file_info?: SourceFileInfo
  features_statistics?: {
    coding_genes?: {
      count?: number
    }
    non_coding_genes?: {
      count?: number
    }
    pseudogenes?: {
      count?: number
    }
  }
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
  assembly_stats?: AssemblyStats
  release_date?: string
  submitter?: string
  download_url?: string
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
