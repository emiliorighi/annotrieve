"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, BarChart3, Settings2, X, ArrowDown, ArrowUp, Star, GitCompare } from "lucide-react"
import { AnnotationsStatsDashboard } from "@/components/annotations-stats-dashboard"
import { AnnotationsFiltersDialog } from "@/components/annotations-filters-dialog"
import { AnnotationsPagination } from "@/components/annotations-pagination"
import { AnnotationCard } from "@/components/annotation-card"
import { AnnotationsCompare } from "@/components/annotations-compare"
import type { FilterType, Annotation } from "@/lib/types"
import { listAnnotations, getAnnotationsStatsSummary, getAnnotationsFrequencies } from "@/lib/api/annotations"
import { Button } from "./ui/button"
import { useSelectedAnnotationsStore } from "@/lib/stores/selected-annotations"
import { cn } from "@/lib/utils"

interface AnnotationsListProps {
  filterType: FilterType
  filterObject: Record<string, any>
  selectedAssemblyAccessions?: string[]
}

export function AnnotationsList({ filterType, filterObject, selectedAssemblyAccessions }: AnnotationsListProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const showFavs = searchParams?.get('showFavs') === 'true'
  
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [totalAnnotations, setTotalAnnotations] = useState<number>(0)
  const [stats, setStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "statistics" | "compare">("list")
  // Filter states
  const [biotypes, setBiotypes] = useState<string[]>([])
  const [featureTypes, setFeatureTypes] = useState<string[]>([])
  const [pipelines, setPipelines] = useState<string[]>([])
  const [providers, setProviders] = useState<string[]>([])
  const [source, setSource] = useState<string>("all")
  const [sortByDate, setSortByDate] = useState<"newest" | "oldest" | "none">("none")
  const [mostRecentPerSpecies, setMostRecentPerSpecies] = useState<boolean>(false)
  // Filter options
  const [biotypeOptions, setBiotypeOptions] = useState<string[]>([])
  const [featureTypeOptions, setFeatureTypeOptions] = useState<string[]>([])
  const [pipelineOptions, setPipelineOptions] = useState<string[]>([])
  const [providerOptions, setProviderOptions] = useState<string[]>([])
  const [sourceOptions, setSourceOptions] = useState<string[]>([])

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage] = useState<number>(10)

  // Dialog state
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false)

  // Zustand store
  const { isSelected: isSelectedStore, getSelectedAnnotations, getSelectionCount } = useSelectedAnnotationsStore()
  const isSelected = (id: string) => isSelectedStore(id)
  const favoritesCount = getSelectionCount()

  // Reset view mode when exiting favorites view while in compare mode
  useEffect(() => {
    if (!showFavs && viewMode === "compare") {
      setViewMode("list")
    }
  }, [showFavs, viewMode])

  // Fetch filter options
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const baseParams = getBaseParams()

        // Apply most recent per species filter to options as well
        if (mostRecentPerSpecies) {
          baseParams.latest_release_by = 'organism'
        }

        const [biotypesRes, featureTypesRes, pipelinesRes, providersRes, sourcesRes] = await Promise.all([
          getAnnotationsFrequencies('biotype', baseParams),
          getAnnotationsFrequencies('feature_type', baseParams),
          getAnnotationsFrequencies('pipeline', baseParams),
          getAnnotationsFrequencies('provider', baseParams),
          getAnnotationsFrequencies('database', baseParams)
        ])

        setBiotypeOptions(Object.keys(biotypesRes).filter(key => key !== 'no_value').sort())
        setFeatureTypeOptions(Object.keys(featureTypesRes).filter(key => key !== 'no_value').sort())
        setPipelineOptions(Object.keys(pipelinesRes).filter(key => key !== 'no_value').sort())
        setProviderOptions(Object.keys(providersRes).filter(key => key !== 'no_value').sort())
        setSourceOptions(Object.keys(sourcesRes).filter(key => key !== 'no_value').sort())
      } catch (error) {
        console.error("Error fetching filter options:", error)
      }
    }
    fetchFilterOptions()
  }, [filterType, filterObject, selectedAssemblyAccessions, mostRecentPerSpecies, showFavs, favoritesCount])

  const getBaseParams = () => {
    let params: Record<string, any> = {}
    if (showFavs) {
      const favoriteAnnotations = getSelectedAnnotations()
      const favoriteIds = favoriteAnnotations.map((annotation: Annotation) => annotation.annotation_id)
      if (favoriteIds.length > 0) {
        params = { ...params, md5_checksums: favoriteIds.join(',') }
      }
    }
    if (filterType === "organism" || filterType === "taxon") {
      params = { ...params, taxids: filterObject?.taxid }
      if (selectedAssemblyAccessions && selectedAssemblyAccessions.length > 0) {
        params = { ...params, assembly_accessions: selectedAssemblyAccessions.join(',') }
      }
    } else if (filterType === "assembly") {
      params = { ...params, assembly_accessions: filterObject?.assembly_accession || filterObject?.assemblyAccession }
    }
    return params
  }

  useEffect(() => {
    async function fetchData() {
      try {

        const offset = (currentPage - 1) * itemsPerPage
        let params: Record<string, any> = { limit: itemsPerPage, offset: offset }
        if (showFavs) {
          const favoriteAnnotations = getSelectedAnnotations()
          const favoriteIds = favoriteAnnotations.map((annotation: Annotation) => annotation.annotation_id)
          if (favoriteIds.length > 0) {
            const limit = favoriteIds.length + 1
            params = { ...params, md5_checksums: favoriteIds.join(','), limit: limit }
          } else {
            // No favorites, return empty results
            setAnnotations([])
            setTotalAnnotations(0)
            setStats(null)
            setStatsLoading(false)
            return
          }
        }
        // Add base filters
        if (filterType === "organism" || filterType === "taxon") {
          params = { ...params, taxids: filterObject?.taxid }
          if (selectedAssemblyAccessions && selectedAssemblyAccessions.length > 0) {
            params = { ...params, assembly_accessions: selectedAssemblyAccessions.join(',') }
          }
        } else if (filterType === "assembly") {
          params = { ...params, assembly_accessions: filterObject?.assembly_accession || filterObject?.assemblyAccession }
        }

        // Add new filters
        if (biotypes.length > 0) params.biotypes = biotypes.join(',')
        if (featureTypes.length > 0) params.feature_types = featureTypes.join(',')
        if (pipelines.length > 0) params.pipelines = pipelines.join(',')
        if (providers.length > 0) params.providers = providers.join(',')
        if (source && source !== "all") params.db_sources = source

        // Add most recent per species filter (backend)
        if (mostRecentPerSpecies) {
          params.latest_release_by = 'organism'
        }

        // Add server-side sorting by release date
        if (sortByDate !== "none") {
          params.sort_by = 'source_file_info.release_date'
          params.sort_order = sortByDate === "newest" ? 'desc' : 'asc'
        }

        // Fetch annotations
        const res = await listAnnotations(params as any)
        const fetchedAnnotations = (res as any)?.results as any

        setAnnotations(fetchedAnnotations)
        setTotalAnnotations((res as any)?.total ?? 0)

        // Fetch stats summary
        setStatsLoading(true)
        try {
          const statsParams = { ...params }
          delete statsParams.limit
          delete statsParams.offset
          // Keep latest_release_by in stats params
          const statsRes = await getAnnotationsStatsSummary(statsParams as any)
          setStats(statsRes)
        } catch (statsError) {
          console.error("Error fetching stats:", statsError)
          setStats(null)
        } finally {
          setStatsLoading(false)
        }
      } catch (e) {
        setAnnotations([])
        setStats(null)
      }
    }
    fetchData()
  }, [filterType, filterObject, selectedAssemblyAccessions, biotypes, featureTypes, pipelines, providers, source, currentPage, itemsPerPage, sortByDate, mostRecentPerSpecies, showFavs, favoritesCount, getSelectedAnnotations])


  const clearAllFilters = () => {
    setBiotypes([])
    setFeatureTypes([])
    setPipelines([])
    setProviders([])
    setSource("all")
    setMostRecentPerSpecies(false)
    setCurrentPage(1)
  }

  const hasActiveFilters = biotypes.length > 0 || featureTypes.length > 0 || pipelines.length > 0 || providers.length > 0 || (source && source !== "all") || mostRecentPerSpecies

  // Pagination handlers
  const totalPages = Math.ceil(totalAnnotations / itemsPerPage)

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }

  const handlePageClick = (page: number) => {
    setCurrentPage(page)
  }

  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Filters Dialog */}
      <AnnotationsFiltersDialog
        open={filtersDialogOpen}
        onOpenChange={setFiltersDialogOpen}
        biotypes={biotypes}
        setBiotypes={setBiotypes}
        featureTypes={featureTypes}
        setFeatureTypes={setFeatureTypes}
        pipelines={pipelines}
        setPipelines={setPipelines}
        providers={providers}
        setProviders={setProviders}
        source={source}
        setSource={setSource}
        mostRecentPerSpecies={mostRecentPerSpecies}
        setMostRecentPerSpecies={setMostRecentPerSpecies}
        biotypeOptions={biotypeOptions}
        featureTypeOptions={featureTypeOptions}
        pipelineOptions={pipelineOptions}
        providerOptions={providerOptions}
        sourceOptions={sourceOptions}
        onFilterChange={handleFilterChange}
        onClearAll={clearAllFilters}
        currentHitCount={totalAnnotations}
      />
        {/* Favorites View Banner */}
        {showFavs && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
              <div>
                <h3 className="font-semibold text-foreground">Viewing Favorite Annotations</h3>
                <p className="text-sm text-muted-foreground">
                  Showing {favoritesCount} favorite annotation{favoritesCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/annotations/')}
            >
              <X className="h-4 w-4 mr-2" />
              Exit Favorites View
            </Button>
          </div>
        )}

        {/* Row 1: Title and Filters Button */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              Annotations
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-semibold text-foreground">{totalAnnotations}</span> annotation{totalAnnotations !== 1 ? 's' : ''} available
            </p>
          </div>

          <Button
            variant="outline"
            size="lg"
            onClick={() => setFiltersDialogOpen(true)}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5">
                {biotypes.length + featureTypes.length + pipelines.length + providers.length + (source && source !== "all" ? 1 : 0) + (mostRecentPerSpecies ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <>
              <div className="flex items-center gap-2 p-4 flex-wrap bg-muted/20 rounded-lg">
                <span className="text-xs text-muted-foreground">Active Filters:</span>
                {source && source !== "all" && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    Source: {source}
                  </Badge>
                )}
                {biotypes.slice(0, 2).map((biotype) => (
                  <Badge key={biotype} variant="secondary" className="text-xs px-2 py-0.5">
                    Biotype: {biotype}
                  </Badge>
                ))}
                {biotypes.length > 2 && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    Biotypes: +{biotypes.length - 2} more
                  </Badge>
                )}
                {featureTypes.slice(0, 2).map((featureType) => (
                  <Badge key={featureType} variant="secondary" className="text-xs px-2 py-0.5">
                    Feature: {featureType}
                  </Badge>
                ))}
                {featureTypes.length > 2 && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    Features: +{featureTypes.length - 2} more
                  </Badge>
                )}
                {pipelines.slice(0, 2).map((pipeline) => (
                  <Badge key={pipeline} variant="secondary" className="text-xs px-2 py-0.5">
                    Pipeline: {pipeline}
                  </Badge>
                ))}
                {pipelines.length > 2 && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    Pipelines: +{pipelines.length - 2} more
                  </Badge>
                )}
                {providers.slice(0, 2).map((provider) => (
                  <Badge key={provider} variant="secondary" className="text-xs px-2 py-0.5">
                    Provider: {provider}
                  </Badge>
                ))}
                {providers.length > 2 && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    Providers: +{providers.length - 2} more
                  </Badge>
                )}
                {mostRecentPerSpecies && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    Filter: Most Recent per Species
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            </>
          )}


        {/* Row 4: View Mode Toggle */}
        <div className="flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-1 w-fit">
            <Button
              variant="ghost"
              onClick={() => setViewMode("list")}
              className={cn(
                "gap-2",
                viewMode === "list"
                  ? "text-primary border-primary border-b-2"
                  : "text-muted-foreground hover:text-foreground hover:bg-primary",
              )}
            >
              <FileText className="h-4 w-4" />
              List
            </Button>
            <Button
              variant="ghost"
              onClick={() => setViewMode("statistics")}
              className={cn(
                "gap-2",
                viewMode === "statistics"
                  ? "text-primary border-primary border-b-2"
                  : "text-muted-foreground hover:text-foreground hover:bg-primary",
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Stats
            </Button>
            {showFavs && (
              <Button
                variant="ghost"
                onClick={() => setViewMode("compare")}
                className={cn(
                  "gap-2",
                  viewMode === "compare"
                    ? "text-primary border-primary border-b-2"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary",
                )}
              >
                <GitCompare className="h-4 w-4" />
                Compare
              </Button>
            )}
          </div>
          {/* <GeneCountCompactChart stats={stats} /> */}
        </div>

      {/* List Tab */}
      {viewMode === "list" && (
        <div className="">
          {annotations.length === 0 ? (
            <Card className="p-12 border-2 border-dashed">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 opacity-50 mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-foreground mb-2">No Annotations Found</h4>
                <p className="text-sm max-w-md mx-auto mb-4">
                  No annotations match your current filter criteria.
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="">
              {/* Compact Control Bar */}
              <div className="pb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      if (sortByDate === "none") {
                        setSortByDate("newest")
                      } else if (sortByDate === "newest") {
                        setSortByDate("oldest")
                      } else {
                        setSortByDate("none")
                      }
                    }}
                    className="gap-2"
                  >
                    {sortByDate === "newest" ? (
                      <>
                        <ArrowDown className="h-3 w-3" />
                        Newest Release Date
                      </>
                    ) : sortByDate === "oldest" ? (
                      <>
                        <ArrowUp className="h-3 w-3" />
                        Oldest Release Date
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-3 w-3 opacity-50" />
                        Sort By Release Date
                      </>
                    )}
                  </Button>
                </div>

                <AnnotationsPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPreviousPage={handlePreviousPage}
                  onNextPage={handleNextPage}
                  onPageClick={handlePageClick}
                />
              </div>

              <div className="grid gap-3">
                {annotations.map((annotation) => (
                  <AnnotationCard
                    isSelected={isSelected(annotation.annotation_id)}
                    key={annotation.annotation_id}
                    annotation={annotation}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Tab */}
      {viewMode === "statistics" && (
        <div className="">
          <AnnotationsStatsDashboard stats={stats} loading={statsLoading} />
        </div>
      )}

      {/* Compare Tab */}
      {viewMode === "compare" && showFavs && (
        <div className="">
          <AnnotationsCompare favoriteAnnotations={annotations} />
        </div>
      )}
    </div>
  )
}
