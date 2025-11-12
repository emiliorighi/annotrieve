"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, BarChart3, X, ArrowDown, ArrowUp, Star, GitCompare, Filter } from "lucide-react"
import { AnnotationsStatsDashboard } from "@/components/annotations-stats-dashboard"
import { AnnotationsPagination } from "@/components/annotations-pagination"
import { AnnotationCard } from "@/components/annotation-card"
import { AnnotationsCompare } from "@/components/annotations-compare"
import type { Annotation } from "@/lib/types"
import { Button } from "./ui/button"
import { useSelectedAnnotationsStore } from "@/lib/stores/selected-annotations"
import { useAnnotationsFiltersStore } from "@/lib/stores/annotations-filters"
import { useUIStore } from "@/lib/stores/ui"
import { cn } from "@/lib/utils"

export function AnnotationsList() {
  // Get sidebar state from UI store
  const { isSidebarOpen, toggleSidebar } = useUIStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const showFavs = searchParams?.get('showFavs') === 'true'
  
  // Use store for filters and annotations - use selectors to prevent unnecessary re-renders
  const annotations = useAnnotationsFiltersStore((state) => state.annotations)
  const totalAnnotations = useAnnotationsFiltersStore((state) => state.totalAnnotations)
  const loading = useAnnotationsFiltersStore((state) => state.loading)
  const stats = useAnnotationsFiltersStore((state) => state.stats)
  const statsLoading = useAnnotationsFiltersStore((state) => state.statsLoading)
  const currentPage = useAnnotationsFiltersStore((state) => state.page)
  const itemsPerPage = useAnnotationsFiltersStore((state) => state.itemsPerPage)
  const sortByDate = useAnnotationsFiltersStore((state) => state.sortByDate)
  const selectedTaxids = useAnnotationsFiltersStore((state) => state.selectedTaxids)
  const selectedAssemblyAccessions = useAnnotationsFiltersStore((state) => state.selectedAssemblyAccessions)
  const selectedAssemblyLevels = useAnnotationsFiltersStore((state) => state.selectedAssemblyLevels)
  const selectedAssemblyStatuses = useAnnotationsFiltersStore((state) => state.selectedAssemblyStatuses)
  const selectedRefseqCategories = useAnnotationsFiltersStore((state) => state.selectedRefseqCategories)
  const biotypes = useAnnotationsFiltersStore((state) => state.biotypes)
  const featureTypes = useAnnotationsFiltersStore((state) => state.featureTypes)
  const pipelines = useAnnotationsFiltersStore((state) => state.pipelines)
  const providers = useAnnotationsFiltersStore((state) => state.providers)
  const source = useAnnotationsFiltersStore((state) => state.source)
  const mostRecentPerSpecies = useAnnotationsFiltersStore((state) => state.mostRecentPerSpecies)
  const setAnnotationsPage = useAnnotationsFiltersStore((state) => state.setAnnotationsPage)
  const setAnnotationsSortByDate = useAnnotationsFiltersStore((state) => state.setAnnotationsSortByDate)
  const fetchAnnotations = useAnnotationsFiltersStore((state) => state.fetchAnnotations)
  const fetchAnnotationsStats = useAnnotationsFiltersStore((state) => state.fetchAnnotationsStats)

  const [viewMode, setViewMode] = useState<"list" | "statistics" | "compare">("list")
  const [hasLoadedStats, setHasLoadedStats] = useState(false)

  // Zustand store for favorites
  const { isSelected: isSelectedStore, getSelectedAnnotations, getSelectionCount } = useSelectedAnnotationsStore()
  const isSelected = (id: string) => isSelectedStore(id)
  const favoritesCount = getSelectionCount()


  // Track the last fetch to prevent duplicates
  const lastFetchRef = useRef<string | null>(null)
  
  // Fetch annotations when filters, pagination, or sorting changes
  useEffect(() => {
    // In favorites view, only depend on favoritesCount, not filter params
    if (showFavs) {
      const favoriteAnnotations = getSelectedAnnotations()
      const favoriteIds = favoriteAnnotations.map((annotation: Annotation) => annotation.annotation_id)
      const fetchKey = JSON.stringify({
        showFavs: true,
        favoritesCount,
        favoriteIds: favoriteIds.sort(), // Sort for consistent key
      })
      
      // Skip if this exact fetch was already initiated
      if (lastFetchRef.current === fetchKey) {
        return
      }
      
      lastFetchRef.current = fetchKey
      
      if (favoriteIds.length > 0) {
        fetchAnnotations(true, favoriteIds)
      } else {
        fetchAnnotations(false)
      }
      return
    }
    
    // In normal view, use all filter parameters
    const fetchKey = JSON.stringify({
      selectedTaxids,
      selectedAssemblyAccessions,
      selectedAssemblyLevels,
      selectedAssemblyStatuses,
      selectedRefseqCategories,
      biotypes,
      featureTypes,
      pipelines,
      providers,
      source,
      mostRecentPerSpecies,
      currentPage,
      itemsPerPage,
      sortByDate,
      showFavs: false,
    })
    
    // Skip if this exact fetch was already initiated
    if (lastFetchRef.current === fetchKey) {
      return
    }
    
    lastFetchRef.current = fetchKey
    fetchAnnotations(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedTaxids,
    selectedAssemblyAccessions,
    selectedAssemblyLevels,
    selectedAssemblyStatuses,
    selectedRefseqCategories,
    biotypes,
    featureTypes,
    pipelines,
    providers,
    source,
    mostRecentPerSpecies,
    currentPage,
    itemsPerPage,
    sortByDate,
    showFavs,
    favoritesCount,
    // Note: fetchAnnotations and getSelectedAnnotations are stable Zustand functions
    // We exclude them from deps to prevent unnecessary re-runs, but they're safe to use
  ])

  // Track the last stats fetch to prevent duplicates
  const lastStatsFetchRef = useRef<string | null>(null)
  
  // Fetch stats when statistics tab is opened (lazy load)
  // Also refresh stats when filters change while on statistics tab
  useEffect(() => {
    if (viewMode !== "statistics") {
      // Reset loaded flag when switching away from stats tab
      if (hasLoadedStats) {
        setHasLoadedStats(false)
        lastStatsFetchRef.current = null
      }
      return
    }
    
    // In favorites view, only use favorite IDs for stats
    if (showFavs) {
      const favoriteAnnotations = getSelectedAnnotations()
      const favoriteIds = favoriteAnnotations.map((annotation: Annotation) => annotation.annotation_id)
      const statsFiltersKey = JSON.stringify({
        showFavs: true,
        favoritesCount,
        favoriteIds: favoriteIds.sort(), // Sort for consistent key
      })
      
      // Skip if this exact stats fetch was already initiated
      if (lastStatsFetchRef.current === statsFiltersKey) {
        return
      }
      
      lastStatsFetchRef.current = statsFiltersKey
      setHasLoadedStats(true)
      fetchAnnotationsStats(true, favoriteIds)
      return
    }
    
    // In normal view, use all filter parameters for stats
    const statsFiltersKey = JSON.stringify({
      showFavs: false,
      selectedTaxids,
      selectedAssemblyAccessions,
      selectedAssemblyLevels,
      selectedAssemblyStatuses,
      selectedRefseqCategories,
      biotypes,
      featureTypes,
      pipelines,
      providers,
      source,
      mostRecentPerSpecies,
    })
    
    // Skip if this exact stats fetch was already initiated
    if (lastStatsFetchRef.current === statsFiltersKey) {
      return
    }
    
    lastStatsFetchRef.current = statsFiltersKey
    setHasLoadedStats(true)
    fetchAnnotationsStats(false, [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewMode,
    showFavs,
    favoritesCount,
    selectedTaxids,
    selectedAssemblyAccessions,
    selectedAssemblyLevels,
    selectedAssemblyStatuses,
    selectedRefseqCategories,
    biotypes,
    featureTypes,
    pipelines,
    providers,
    source,
    mostRecentPerSpecies,
    // Note: fetchAnnotationsStats and getSelectedAnnotations are stable Zustand functions
    // We exclude them from deps to prevent unnecessary re-runs
  ])

  // Pagination handlers
  const totalPages = Math.ceil(totalAnnotations / itemsPerPage)

  const handlePreviousPage = () => {
    setAnnotationsPage(Math.max(1, currentPage - 1))
  }

  const handleNextPage = () => {
    setAnnotationsPage(Math.min(totalPages, currentPage + 1))
  }

  const handlePageClick = (page: number) => {
    setAnnotationsPage(page)
  }

  const handleSortByDate = () => {
    if (sortByDate === "none") {
      setAnnotationsSortByDate("newest")
    } else if (sortByDate === "newest") {
      setAnnotationsSortByDate("oldest")
    } else {
      setAnnotationsSortByDate("none")
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Favorites Banner - shown when in favorites view */}
      {showFavs && (
        <div className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-border bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-primary fill-primary" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Favorite Annotations</h2>
                <p className="text-sm text-muted-foreground">
                  Viewing {totalAnnotations} favorite annotation{totalAnnotations !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/annotations')}
            >
              Back to All Annotations
            </Button>
          </div>
        </div>
      )}

      {/* Header - matches sidebar header structure exactly */}
      <div className="flex-shrink-0">
        {/* Title Row - identical to sidebar: px-6 pt-6 pb-4 */}
        <div className={`px-6 ${showFavs ? 'pt-4' : 'pt-6'} pb-4 flex items-center gap-4`}>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              {/* Toggle sidebar button - shown when sidebar is closed, hidden in favorites view */}
              {!isSidebarOpen && !showFavs && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebar}
                  className="h-7 w-7 p-0 -ml-2"
                  title="Show filters"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              )}
              Annotations
            </h1>
          </div>
          <div className="flex">
              <Badge className="text-md" variant="secondary">{totalAnnotations.toLocaleString()}</Badge>
          </div>
        </div>
      </div>

      {/* View Mode Toggle - full width border, tabs aligned with sidebar tabs */}
      <div className="flex-shrink-0 border-b border-border">
        <div className="px-6">
          <div className="flex items-center gap-0 w-fit">
            <Button
              variant="ghost"
              onClick={() => setViewMode("list")}
              className={cn(
                "gap-2 h-9 px-3 rounded-none border-b-2 border-transparent font-medium text-sm",
                viewMode === "list"
                  ? "text-primary border-primary bg-transparent shadow-none"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent",
              )}
            >
              <FileText className="h-4 w-4" />
              List
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setViewMode("statistics")
                // Stats will be fetched by the useEffect when viewMode changes
              }}
              className={cn(
                "gap-2 h-9 px-3 rounded-none border-b-2 border-transparent font-medium text-sm",
                viewMode === "statistics"
                  ? "text-primary border-primary bg-transparent shadow-none"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent",
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Stats
            </Button>
            <Button
              variant="ghost"
              onClick={() => setViewMode("compare")}
              className={cn(
                "gap-2 h-9 px-3 rounded-none border-b-2 border-transparent font-medium text-sm",
                viewMode === "compare"
                  ? "text-primary border-primary bg-transparent shadow-none"
                  : "text-muted-foreground hover:text-foreground hover:bg-transparent",
              )}
            >
              <GitCompare className="h-4 w-4" />
              Compare
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === "compare" ? (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <AnnotationsCompare favoriteAnnotations={annotations as any} showFavs={showFavs} totalAnnotations={totalAnnotations} />
        </div>
      ) : (
        <div className="px-6 py-6">
          {/* List Tab */}
          {viewMode === "list" && (
            <div className="space-y-6">
              {annotations.length === 0 ? (
                <Card className="p-12 border-2 border-dashed">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-12 w-12 opacity-50 mx-auto mb-3" />
                    <h4 className="text-lg font-semibold text-foreground mb-2">No Annotations Found</h4>
                    <p className="text-sm max-w-md mx-auto mb-4">
                      No annotations match your current filter criteria.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Sort Control */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleSortByDate}
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

                  <div className="grid gap-4">
                    {annotations.map((annotation) => (
                      <AnnotationCard
                        isSelected={isSelected(annotation.annotation_id || annotation.md5_checksum || '')}
                        key={annotation.annotation_id || annotation.md5_checksum || ''}
                        annotation={annotation as any}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dashboard Tab */}
          {viewMode === "statistics" && (
            <div>
              <AnnotationsStatsDashboard stats={stats || null} loading={statsLoading} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
