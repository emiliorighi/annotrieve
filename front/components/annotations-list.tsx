"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FileText, CheckSquare, Square, BarChart3, Settings2, X, ArrowDown, ArrowUp } from "lucide-react"
import { AnnotationsStatsDashboard } from "@/components/annotations-stats-dashboard"
import { AnnotationsFiltersDialog } from "@/components/annotations-filters-dialog"
import { AnnotationsPagination } from "@/components/annotations-pagination"
import { AnnotationCard } from "@/components/annotation-card"
import type { FilterType, Annotation } from "@/lib/types"
import { listAnnotations, getAnnotationsStatsSummary, getAnnotationsFrequencies } from "@/lib/api/annotations"
import { BulkDownloadBar } from "@/components/bulk-download-bar"
import { Button } from "./ui/button"
import { useSelectedAnnotationsStore } from "@/lib/stores/selected-annotations"

interface AnnotationsListProps {
  filterType: FilterType
  filterObject: Record<string, any>
  selectedAssemblyAccessions?: string[]
  onJBrowseChange?: (accession: string, annotationId?: string) => void
}

export function AnnotationsList({ filterType, filterObject, selectedAssemblyAccessions, onJBrowseChange }: AnnotationsListProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [totalAnnotations, setTotalAnnotations] = useState<number>(0)
  const [stats, setStats] = useState<any>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  
  // Filter states
  const [biotypes, setBiotypes] = useState<string[]>([])
  const [featureTypes, setFeatureTypes] = useState<string[]>([])
  const [pipelines, setPipelines] = useState<string[]>([])
  const [providers, setProviders] = useState<string[]>([])
  const [source, setSource] = useState<string>("all")
  const [sortByDate, setSortByDate] = useState<"newest" | "oldest" | "none">("none")
  const [mostRecentPerSpecies, setMostRecentPerSpecies] = useState<boolean>(false)
  const [selectAllMode, setSelectAllMode] = useState<"none" | "page" | "all">("none")
  const [loadingAllAnnotations, setLoadingAllAnnotations] = useState(false)
  
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
  const {
    toggleSelection,
    selectAll,
    clearSelection,
    removeFromCart,
    isSelected,
    allSelected,
    someSelected,
    getSelectedAnnotations,
    getSelectionCount,
  } = useSelectedAnnotationsStore()

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
  }, [filterType, filterObject, selectedAssemblyAccessions, mostRecentPerSpecies])

  const getBaseParams = () => {
    let params: Record<string, any> = {}
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
        
        // Fetch annotations
        const res = await listAnnotations(params as any)
        let fetchedAnnotations = (res as any)?.results as any
        
        // Apply client-side sorting
        if (sortByDate !== "none" && fetchedAnnotations?.length > 0) {
          fetchedAnnotations.sort((a: Annotation, b: Annotation) => {
            const dateA = new Date(a.source_file_info.release_date).getTime()
            const dateB = new Date(b.source_file_info.release_date).getTime()
            return sortByDate === "newest" ? dateB - dateA : dateA - dateB
          })
        }
        
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
  }, [filterType, filterObject, selectedAssemblyAccessions, biotypes, featureTypes,  pipelines, providers, source, currentPage, itemsPerPage, sortByDate, mostRecentPerSpecies])

  const handleSelectPage = () => {
    selectAll(annotations)
    setSelectAllMode("page")
  }

  const handleSelectAll = async () => {
    setLoadingAllAnnotations(true)
    try {
      // Fetch all annotations without pagination
      let params: Record<string, any> = {}
      
      // Add base filters
      if (filterType === "organism" || filterType === "taxon") {
        params = { ...params, taxids: filterObject?.taxid }
        if (selectedAssemblyAccessions && selectedAssemblyAccessions.length > 0) {
          params = { ...params, assembly_accessions: selectedAssemblyAccessions.join(',') }
        }
      } else if (filterType === "assembly") {
        params = { ...params, assembly_accessions: filterObject?.assembly_accession || filterObject?.assemblyAccession }
      }
      
      // Add filters
      if (biotypes.length > 0) params.biotypes = biotypes.join(',')
      if (featureTypes.length > 0) params.feature_types = featureTypes.join(',')
      if (pipelines.length > 0) params.pipelines = pipelines.join(',')
      if (providers.length > 0) params.providers = providers.join(',')
      if (source && source !== "all") params.db_sources = source
      if (mostRecentPerSpecies) params.latest_release_by = 'organism'
      
      // Fetch all annotations (no limit)
      params.limit = 20000 // Set a high limit to get all results
      params.fields = 'annotation_id,source_file_info.release_date,source_file_info.database,indexed_file_info.file_size,assembly_name,organism_name'
      params.offset = 0
      
      const res = await listAnnotations(params as any)
      let allAnnotations = (res as any)?.results as any
      
      // Apply client-side sorting
      if (sortByDate !== "none" && allAnnotations?.length > 0) {
        allAnnotations.sort((a: Annotation, b: Annotation) => {
          const dateA = new Date(a.source_file_info.release_date).getTime()
          const dateB = new Date(b.source_file_info.release_date).getTime()
          return sortByDate === "newest" ? dateB - dateA : dateA - dateB
        })
      }
      
      selectAll(allAnnotations)
      setSelectAllMode("all")
    } catch (error) {
      console.error("Error fetching all annotations:", error)
    } finally {
      setLoadingAllAnnotations(false)
    }
  }

  const handleClearSelection = () => {
    clearSelection()
    setSelectAllMode("none")
  }

  const handleToggleSelection = (annotation: Annotation) => {
    toggleSelection(annotation)
  }

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
    <div className="space-y-6 mt-10">
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

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-foreground">
            Related Annotations
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{totalAnnotations.toLocaleString()}</span> annotation{totalAnnotations !== 1 ? 's' : ''} found
          </p>
        </div>
        
        <Button
          variant="outline"
          size="lg"
          onClick={() => setFiltersDialogOpen(true)}
          className="h-9 gap-2"
        >
          <Settings2 className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="default" className="ml-1 text-xs px-1.5 py-0.5">
              {biotypes.length + featureTypes.length + pipelines.length + providers.length + (source && source !== "all" ? 1 : 0) + (mostRecentPerSpecies ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* Active Filters Display - Compact */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Active:</span>
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
      )}

      {/* Tabs for List and Stats */}
      <Tabs defaultValue="list" className="w-full">
        <div className="flex items-center mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-11">
            <TabsTrigger value="list" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-4 w-4" />
              <span className="font-medium">List View</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="font-medium">Statistics</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* List Tab */}
        <TabsContent value="list" className="space-y-4 mt-0">
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
            <>
              {/* Compact Control Bar */}
              <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-3">
                  {/* <Button
                    variant={allSelected(annotations) ? "default" : "outline"}
                    size="sm"
                    onClick={allSelected(annotations) ? handleClearSelection : handleSelectPage}
                    className="h-8 text-xs"
                    disabled={loadingAllAnnotations}
                  >
                    {allSelected(annotations) ? (
                      <>
                        <CheckSquare className="h-3 w-3 mr-1" />
                        Deselect
                      </>
                    ) : (
                      <>
                        <Square className="h-3 w-3 mr-1" />
                        Select Page
                      </>
                    )}
                  </Button>

                  {selectAllMode === "page" && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={loadingAllAnnotations}
                      className="h-8 text-xs text-primary"
                    >
                      {loadingAllAnnotations ? "Loading..." : `Select all ${totalAnnotations}`}
                    </Button>
                  )}

                  {selectAllMode === "all" && (
                    <Badge variant="default" className="text-xs px-2 py-1">
                      All {totalAnnotations} selected
                    </Badge>
                  )}
                  
                  {selectAllMode === "none" && getSelectionCount() > 0 && (
                    <Badge variant="default" className="text-xs px-2 py-1">
                      {getSelectionCount()} in cart
                    </Badge>
                  )} */}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (sortByDate === "none") {
                        setSortByDate("newest")
                      } else if (sortByDate === "newest") {
                        setSortByDate("oldest")
                      } else {
                        setSortByDate("none")
                      }
                    }}
                    className="h-8 text-xs gap-1"
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
                    onToggleSelection={() => handleToggleSelection(annotation)} 
                    isSelected={isSelected(annotation.annotation_id)} 
                    key={annotation.annotation_id} 
                    annotation={annotation} 
                    onJBrowseChange={onJBrowseChange} 
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-0">
          <AnnotationsStatsDashboard stats={stats} loading={statsLoading} />
        </TabsContent>
      </Tabs>

      {getSelectionCount() > 0 && (
        <BulkDownloadBar
          selectedAnnotations={getSelectedAnnotations()}
          onClearSelection={handleClearSelection}
          onRemoveItem={removeFromCart}
        />
      )}
    </div>
  )
}
