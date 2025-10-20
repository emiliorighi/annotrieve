"use client"

import { Suspense, useState, useEffect } from "react"
import JBrowseLinearGenomeViewComponent from "@/components/jbrowse"
import { ChromosomeViewer } from "@/components/chromosome-viewer"
import { getAssembly } from "@/lib/api/assemblies"
import { listAnnotations } from "@/lib/api/annotations"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Building2, Dna, FileText, ChevronDown, ChevronUp, Hash, ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { AssemblyRecord, AnnotationRecord } from "@/lib/api/types"
import { Button } from "@/components/ui/button"

interface ChromosomeInterface {
  accession_version: string
  chr_name: string
  length: number
  aliases: string[]
}

function JBrowseContent() {
  const [accession, setAccession] = useState<string | null>(null)
  const [annotationId, setAnnotationId] = useState<string>('')
  const [assembly, setAssembly] = useState<AssemblyRecord | null>(null)
  const [annotations, setAnnotations] = useState<AnnotationRecord[]>([])
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | undefined>()
  const [selectedChromosome, setSelectedChromosome] = useState<ChromosomeInterface | null>(null)
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  // Read URL parameters on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const accessionParam = urlParams.get('accession')
      const annotationIdParam = urlParams.get('annotationId')
      
      setAccession(accessionParam)
      if (annotationIdParam) {
        setAnnotationId(annotationIdParam)
        setSelectedAnnotationId(annotationIdParam)
      }
      setIsInitialized(true)
    }
  }, [])

  useEffect(() => {
    async function fetchData() {
      if (!accession) return
      
      try {
        setIsLoading(true)
        const [assemblyData, annotationsData] = await Promise.all([
          getAssembly(accession),
          listAnnotations({ assembly_accessions: accession, limit: 100 })
        ])
        
        setAssembly(assemblyData)
        setAnnotations(annotationsData.results ?? [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [accession])

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show error only after initialization and if no accession
  if (!accession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Accession</h1>
          <p className="text-gray-600 mb-4">No assembly accession provided in URL parameters.</p>
          <Link href="/">
            <Button variant="default" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Genome Browser</h1>
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Assembly and Annotations Info */}
        <Card className="overflow-hidden">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
          >
            <div className="flex items-center gap-4">
              <Dna className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground italic">
                  {isLoading ? 'Loading...' : assembly?.organism_name || accession}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {accession} • {assembly?.assembly_name || 'Assembly'} • {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {isDetailsExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {isDetailsExpanded && !isLoading && assembly && (
            <div className="border-t p-4 bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {/* Assembly Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">Submitter:</span>
                    <span className="text-muted-foreground">{assembly.submitter}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">Released:</span>
                    <span className="text-muted-foreground">
                      {assembly.release_date ? new Date(assembly.release_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chromosome Viewer */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Dna className="h-4 w-4" />
                  Chromosomes:
                </div>
                <ChromosomeViewer 
                  accession={accession}
                  onChromosomeSelected={(chromosome) => setSelectedChromosome(chromosome)}
                  showDetails={false}
                />
              </div>

              {/* Annotations List */}
              {annotations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <FileText className="h-4 w-4" />
                    Available Annotations ({annotations.length}):
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {annotations.map((annotation) => {
                      const codingGenes = annotation.features_statistics?.coding_genes?.count
                      const nonCodingGenes = annotation.features_statistics?.non_coding_genes?.count
                      const pseudogenes = annotation.features_statistics?.pseudogenes?.count
                      const hasGeneCounts = codingGenes !== undefined || nonCodingGenes !== undefined || pseudogenes !== undefined

                      return (
                        <button
                          key={annotation.md5_checksum}
                          onClick={() => setSelectedAnnotationId(
                            selectedAnnotationId === annotation.md5_checksum ? undefined : annotation.md5_checksum
                          )}
                          className={`p-4 rounded-lg border text-left transition-all ${
                            selectedAnnotationId === annotation.md5_checksum
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }`}
                        >
                          {/* Header with badges */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-xs font-semibold">
                                {annotation.source_file_info?.database || 'Unknown'}
                              </Badge>
                              <Badge variant="accent" className="text-xs">
                                {annotation.source_file_info?.provider || 'Unknown Provider'}
                              </Badge>
                            </div>
                            {annotation.source_file_info?.release_date && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                                <Calendar className="h-3 w-3" />
                                {new Date(annotation.source_file_info.release_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          {/* Gene Counts */}
                          {hasGeneCounts && (
                            <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-accent/5 rounded-lg border border-accent/20">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Dna className="h-3.5 w-3.5 text-accent" />
                                <span className="font-medium">Genes:</span>
                              </div>
                              <div className="flex items-center gap-4">
                                {codingGenes !== undefined && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground">Coding</span>
                                    <span className="text-sm font-semibold text-foreground">{codingGenes.toLocaleString()}</span>
                                  </div>
                                )}
                                {nonCodingGenes !== undefined && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground">Non-coding</span>
                                    <span className="text-sm font-semibold text-foreground">{nonCodingGenes.toLocaleString()}</span>
                                  </div>
                                )}
                                {pseudogenes !== undefined && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground">Pseudo</span>
                                    <span className="text-sm font-semibold text-foreground">{pseudogenes.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* MD5 Checksum */}
                          {annotation.md5_checksum && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Hash className="h-3 w-3" />
                              <span className="font-mono">{annotation.md5_checksum.slice(0, 16)}...</span>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* JBrowse Viewer */}
        <Card className="p-4">
          <Suspense 
            fallback={
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading genome browser...</p>
                </div>
              </div>
            }
          >
            <JBrowseLinearGenomeViewComponent 
              accession={accession} 
              annotationId={selectedAnnotationId}
              selectedChromosome={selectedChromosome}
            />
          </Suspense>
        </Card>
      </main>
    </div>
  )
}

export default function JBrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <JBrowseContent />
    </Suspense>
  )
}
