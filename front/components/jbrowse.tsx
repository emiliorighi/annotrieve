'use client'
import { useState, useEffect, useMemo } from 'react'
import RefGetPlugin from 'jbrowse-plugin-refget-api'
import {
  createViewState,
  JBrowseLinearGenomeView,
  ViewModel,
} from '@jbrowse/react-linear-genome-view2'
import { getAssembledMolecules } from '@/lib/api/assemblies'
import { listAnnotations } from '@/lib/api/annotations'
import { getJBrowseWorker } from '@/lib/jbrowse-worker'

interface JBrowseLinearGenomeViewComponentProps {
  accession: string
  annotationId?: string
}
// Use relative URLs to leverage Next.js rewrites and avoid CORS issues
const baseURL = process.env.NEXT_PUBLIC_API_URL || ''
const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || ''

const configuration = {
  theme: {
    palette: {
      mode: 'dark',
      primary: {
        main: '#0891b2', // Cyan-600 - matches app primary
      },
      secondary: {
        main: '#d97706', // Amber-600 - matches app secondary
      },
      tertiary: {
        main: '#ea580c', // Orange-600 - matches app destructive
      },
      quaternary: {
        main: '#dc2626', // Red-600 - complementary error color
      },
      bases: {
        A: { main: '#98FB98' }, // Pale green for Adenine
        C: { main: '#87CEEB' }, // Sky blue for Cytosine
        G: { main: '#DAA520' }, // Goldenrod for Guanine
        T: { main: '#DC143C' }, // Crimson for Thymine
      },
    },
  },
}

export default function JBrowseLinearGenomeViewComponent({ accession, annotationId }: JBrowseLinearGenomeViewComponentProps) {
  const [viewState, setViewState] = useState<ViewModel>()
  const [chromosomes, setChromosomes] = useState<any[]>([])
  const [annotations, setAnnotations] = useState<any[]>([])
  const [assemblyName, setAssemblyName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // Fetch data in parallel for better performance
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    async function fetchData() {
      try {
        // Fetch both in parallel instead of sequentially
        const [chromosomesResponse, annotationsResponse] = await Promise.all([
          getAssembledMolecules(accession, 0, 100), // Reduced from 1000 to 100 for faster loading
          listAnnotations({ assembly_accessions: accession, limit: 100 }) // Reduced from 1000 to 100
        ])

        if (cancelled) return

        const chromosomeResults = chromosomesResponse.results ?? []
        const annotationResults = annotationsResponse.results ?? []
        
        setChromosomes(chromosomeResults)
        setAssemblyName(annotationResults[0]?.assembly_name ?? '')
        
        if (annotationId) {
          setAnnotations(annotationResults.filter((annotation: any) => annotation.annotation_id === annotationId))
        } else {
          setAnnotations(annotationResults)
        }
      } catch (error) {
        console.error('Error fetching JBrowse data:', error)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [accession, annotationId])

  // Memoize tracks to prevent recreation on every render
  const tracks = useMemo(() => {
    return annotations.map((annotation) => ({
      type: 'FeatureTrack',
      trackId: annotation.annotation_id,
      name: annotation.source_file_info.provider || `${annotation.source_file_info.database} - ${annotation.assembly_name}`,
      assemblyNames: [annotation.assembly_name],
      category: [annotation.source_file_info.database],
      adapter: {
        type: "Gff3TabixAdapter",
        gffGzLocation: {
          uri: `${baseURL}/files/${annotation.indexed_file_info.bgzipped_path}`,
          locationType: "UriLocation",
        },
        index: {
          location: {
            uri: `${baseURL}/files/${annotation.indexed_file_info.csi_path}`,
            locationType: "UriLocation",
          },
          indexType: "CSI"
        },
      }
    }))
  }, [annotations])

  // Memoize sequence data to prevent recreation
  const sequenceData = useMemo(() => {
    return Object.fromEntries(
      chromosomes.map((chromosome) => {
        const key = `insdc:${chromosome.genbank_accession}`
        return [key, {
          name: chromosome.chr_name || chromosome.ucsc_style_name || chromosome.sequence_name,
          size: Number(chromosome.length || 0)
        }]
      })
    )
  }, [chromosomes])

  // Memoize assembly configuration
  const assembly = useMemo(() => ({
    name: assemblyName,
    refNameAliases: {
      adapter: {
        type: "RefNameAliasAdapter",
        location: {
          uri: `${apiBaseURL}/assemblies/${accession}/chr_aliases`,
          locationType: "UriLocation"
        }
      }
    },
    sequence: {
      name: assemblyName,
      trackId: `${accession}-seq`,
      type: 'ReferenceSequenceTrack',
      adapter: {
        type: "RefGetAdapter",
        sequenceData
      }
    }
  }), [assemblyName, sequenceData, accession])

  // Create view state only when dependencies change
  useEffect(() => {
    if (!annotations.length || !chromosomes.length || !assemblyName || !tracks.length) {
      return
    }

    const state = createViewState({
      assembly,
      tracks,
      plugins: [RefGetPlugin],
      configuration: {
        rpc: {
          defaultDriver: 'WebWorkerRpcDriver',
        },
        ...configuration,
      },
      makeWorkerInstance: getJBrowseWorker,
    })
    setViewState(state)
  }, [assembly, tracks])

  if (isLoading || !viewState) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {isLoading ? 'Loading genome data...' : 'Initializing genome browser...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <JBrowseLinearGenomeView viewState={viewState} />
    </div>
  )
}