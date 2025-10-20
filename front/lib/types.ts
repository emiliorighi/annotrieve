export type FilterType = "taxon" | "organism" | "assembly" | null

export interface TaxonNode {
  id: string
  name: string
  rank: string
  scientificName: string
  commonName?: string
  description: string
  annotationCount: number
  children?: TaxonNode[]
}

export interface Chromosome {
  chr_name: string
  length: number
  genbank_accession?: string
  refseq_accession?: string
  sequence_name?: string
  aliases: string[]
}

export interface Organism {
  id: string
  scientificName: string
  commonName?: string
  taxonId: string
  taxonName: string
  description: string
  assemblies: string[]
  annotationCount: number
}

export interface Assembly {
  id: string
  name: string
  accession: string
  organismId: string
  organismName: string
  level: string
  releaseDate: string
  submitter: string
  description: string
  annotationCount: number
}

export interface Annotation {
  taxid: string
  taxon_lineage: string[]
  organism_name: string
  assembly_accession: string
  assembly_name: string
  annotation_id: string
  source_file_info: {
    database: string
    provider: string
    last_modified: string
    uncompressed_md5: string
    pipeline: {
      name: string
      version: string
      method: string
    }
    release_date: string
    source_database: "GenBank" | "RefSeq" | "Ensembl"
  }
  indexed_file_info: {
    file_size: number
    bgzipped_path: string
    csi_path: string
    uncompressed_md5: string
    processed_at: string
    pipeline: {
      name: string
      version: string
      method: string
    }
  }
  features_summary: {
    root_types_counts: Record<string, number>
    attribute_keys: string[]
    types: string[]
    sources: string[]
    biotypes: string[]
    root_types: string[]
    types_missing_id: string[]
    has_biotype: boolean
    has_cds: boolean
    has_exon: boolean
  }
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
}

export interface SearchResult {
  type: "taxon" | "organism" | "assembly"
  id: string
  name: string
  subtitle: string
  annotationCount: number
  relatedObject: Record<string, any>
}
