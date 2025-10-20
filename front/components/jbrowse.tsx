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

interface ChromosomeInterface {
  accession_version: string
  chr_name: string
  length: number
  aliases: string[]
}

interface JBrowseLinearGenomeViewComponentProps {
  accession: string
  annotationId?: string
  selectedChromosome?: ChromosomeInterface | null
}
// Use relative URLs to leverage Next.js rewrites and avoid CORS issues
// For GitHub Pages deployment, use absolute URLs
const baseURL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname.includes('github.io') 
    ? 'https://genome.crg.es/annotrieve' 
    : '')
const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname.includes('github.io') 
    ? 'https://genome.crg.es/annotrieve/api/v0' 
    : '')

const configuration = {
  theme: {
    palette: {
      mode: 'dark',
      // UI Colors - Muted and harmonious with dark background
      primary: {
        main: '#64748b', // Slate-500 - Muted gray-blue for primary actions
        light: '#94a3b8', // Slate-400 - Lighter variant
        dark: '#475569', // Slate-600 - Darker variant
        contrastText: '#ffffff', // White text on muted gray
      },
      secondary: {
        main: '#6b7280', // Gray-500 - Neutral gray for secondary actions
        light: '#9ca3af', // Gray-400 - Lighter variant
        dark: '#4b5563', // Gray-600 - Darker variant
        contrastText: '#ffffff', // White text on gray
      },
      tertiary: {
        main: '#7c2d12', // Red-800 - Dark red for tertiary elements
        light: '#991b1b', // Red-800 - Slightly lighter
        dark: '#5c1a1a', // Custom dark red
        contrastText: '#ffffff', // White text on dark red
      },
      quaternary: {
        main: '#1e3a8a', // Blue-800 - Dark blue for quaternary elements
        light: '#1e40af', // Blue-700 - Lighter variant
        dark: '#1e293b', // Slate-800 - Darker variant
        contrastText: '#ffffff', // White text on dark blue
      },
    },
  },
}

export default function JBrowseLinearGenomeViewComponent({ accession, annotationId, selectedChromosome }: JBrowseLinearGenomeViewComponentProps) {
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
      },
      displays: [
        {
          type: "LinearBasicDisplay",
          displayId: `${annotation.annotation_id}_TrackDisplay`,
          renderer: {
            type: "SvgFeatureRenderer",
            showLabels: true,
            showDescriptions: true,
            labels: {
              descriptionColor: "#8b8b8b",    // <-- override this
            },
          }
        }
      ]

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

    // Get the first chromosome for default location
    const firstChromosome = chromosomes[0]
    const defaultLocation = firstChromosome
      ? `${firstChromosome.chr_name || firstChromosome.sequence_name}:1-${Math.min(100000, firstChromosome.length)}`
      : undefined

    // Create session tracks with all tracks visible by default
    const sessionTracks = tracks.map((track) => ({
      type: 'FeatureTrack',
      configuration: track.trackId,
      displays: [
        {
          type: 'LinearBasicDisplay',
          configuration: `${track.trackId}_TrackDisplay`,
        },
      ],
    }))

    // JBrowse needs to create multiple workers for its RPC system
    // Don't use a singleton - let JBrowse manage worker lifecycle
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
      defaultSession: {
        name: 'Annotrieve Session',
        view: {
          id: 'linearGenomeView',
          type: 'LinearGenomeView',
          ...(defaultLocation && firstChromosome && {
            displayedRegions: [
              {
                refName: firstChromosome.chr_name || firstChromosome.sequence_name,
                start: 0,
                end: Math.min(100000, firstChromosome.length),
                assemblyName,
              }
            ]
          }),
          tracks: sessionTracks,
        },
      },
      makeWorkerInstance: () => {
        return new Worker(new URL('../app/rpcWorker.ts', import.meta.url))
      },
    })
    setViewState(state)
  }, [assembly, tracks, chromosomes, assemblyName])

  // Update view when chromosome is selected
  useEffect(() => {
    if (!viewState || !selectedChromosome || !assemblyName) return

    try {
      // Navigate to the selected chromosome
      const view = viewState.session.view
      view.navToLocString(
        `${selectedChromosome.chr_name}:1-${Math.min(100000, selectedChromosome.length)}`,
        assemblyName
      )
    } catch (error) {
      console.error('Error navigating to chromosome:', error)
    }
  }, [selectedChromosome, viewState, assemblyName])

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