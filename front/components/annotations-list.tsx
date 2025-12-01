"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { FileText, Star, Loader2, ArrowUp, ArrowDown, PanelLeftClose, PanelLeftOpen, Network, Database } from "lucide-react"
import { AnnotationsStatsDashboard } from "@/components/annotations-stats-dashboard"
import { AnnotationCard } from "@/components/annotation-card"
import type { Annotation } from "@/lib/types"
import type { AnnotationRecord } from "@/lib/api/types"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSelectedAnnotationsStore } from "@/lib/stores/selected-annotations"
import { useAnnotationsFiltersStore, type SortOption } from "@/lib/stores/annotations-filters"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useUIStore } from "@/lib/stores/ui"
import { downloadAnnotationsReport } from "@/lib/api/annotations"

interface AnnotationsListProps {
  annotations: AnnotationRecord[]
  totalAnnotations: number
  loading: boolean
}

export function AnnotationsList({ annotations, totalAnnotations, loading }: AnnotationsListProps) {
  // Get sidebar state from UI store
  const searchParams = useSearchParams()
  const router = useRouter()
  const showFavs = searchParams?.get('showFavs') === 'true'

  // Use store for filters and pagination
  const stats = useAnnotationsFiltersStore((state) => state.stats)
  const statsLoading = useAnnotationsFiltersStore((state) => state.statsLoading)
  const currentPage = useAnnotationsFiltersStore((state) => state.page)
  const setAnnotationsPage = useAnnotationsFiltersStore((state) => state.setAnnotationsPage)
  const sortOption = useAnnotationsFiltersStore((state) => state.sortOption)
  const setAnnotationsSortOption = useAnnotationsFiltersStore((state) => state.setAnnotationsSortOption)
  const fetchAnnotationsStats = useAnnotationsFiltersStore((state) => state.fetchAnnotationsStats)
  const selectedTaxons = useAnnotationsFiltersStore((state) => state.selectedTaxons)
  const selectedAssemblies = useAnnotationsFiltersStore((state) => state.selectedAssemblies)
  const selectedBioprojects = useAnnotationsFiltersStore((state) => state.selectedBioprojects)
  const selectedAssemblyLevels = useAnnotationsFiltersStore((state) => state.selectedAssemblyLevels)
  const selectedAssemblyStatuses = useAnnotationsFiltersStore((state) => state.selectedAssemblyStatuses)
  const onlyRefGenomes = useAnnotationsFiltersStore((state) => state.onlyRefGenomes)
  const biotypes = useAnnotationsFiltersStore((state) => state.biotypes)
  const featureTypes = useAnnotationsFiltersStore((state) => state.featureTypes)
  const pipelines = useAnnotationsFiltersStore((state) => state.pipelines)
  const providers = useAnnotationsFiltersStore((state) => state.providers)
  const databaseSources = useAnnotationsFiltersStore((state) => state.databaseSources)

  const [showStats, setShowStats] = useState(false)
  const [hasLoadedStats, setHasLoadedStats] = useState(false)
  const [accumulatedAnnotations, setAccumulatedAnnotations] = useState<AnnotationRecord[]>([])
  const [loadingMore, setLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const buildParams = useAnnotationsFiltersStore((state) => state.buildAnnotationsParams)

  // Use store annotations directly for page 1, accumulated for infinite scroll
  const allAnnotations = currentPage === 1 ? annotations : accumulatedAnnotations
  const hasMore = allAnnotations.length < totalAnnotations && totalAnnotations > 0
  // Zustand store for favorites
  const { isSelected: isSelectedStore } = useSelectedAnnotationsStore()
  const isSelected = (id: string) => isSelectedStore(id)
  const getSelectedAnnotations = useSelectedAnnotationsStore((state) => state.getSelectedAnnotations)

  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen)
  const isDesktop = useUIStore((state) => state.isDesktop)
  const setIsSidebarOpen = useUIStore((state) => state.setIsSidebarOpen)
  const openRightSidebar = useUIStore((state) => state.openRightSidebar)

  const filtersButtonDisabled = showFavs

  const handleFiltersToggle = useCallback(() => {
    if (filtersButtonDisabled) return
    if (isDesktop) {
      setIsSidebarOpen(!isSidebarOpen)
    } else {
      setIsSidebarOpen(true)
    }
  }, [filtersButtonDisabled, isDesktop, isSidebarOpen, setIsSidebarOpen])

  const handleBrowseAssemblies = useCallback(() => {
    openRightSidebar('assemblies-list')
  }, [openRightSidebar])

  // Accumulate annotations for infinite scroll (page > 1)
  useEffect(() => {
    if (currentPage === 1) {
      setAccumulatedAnnotations([])
      return
    }
    if (annotations && annotations.length > 0) {
      setAccumulatedAnnotations(prev => {
        const existingIds = new Set(prev.map(a => a.annotation_id || a.md5_checksum || ''))
        const newAnnotations = annotations.filter(a => {
          const id = a.annotation_id || a.md5_checksum || ''
          return id && !existingIds.has(id)
        })
        return newAnnotations.length > 0 ? [...prev, ...newAnnotations] : prev
      })
    }
  }, [annotations, currentPage])

  // Infinite scroll: load more when reaching the bottom
  useEffect(() => {
    if (showFavs || loading || loadingMore || !hasMore || allAnnotations.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setLoadingMore(true)
          setAnnotationsPage(currentPage + 1)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMore, loading, loadingMore, currentPage, showFavs, setAnnotationsPage, allAnnotations.length])

  // Load more annotations when page changes (for infinite scroll)
  // Note: This is handled by the parent component (page.tsx) which refetches when page changes
  useEffect(() => {
    if (currentPage > 1 && !showFavs && !loading) {
      setLoadingMore(false)
    }
  }, [currentPage, showFavs, loading])

  // Track the last stats fetch to prevent duplicates
  const lastStatsFetchRef = useRef<string | null>(null)

  // Fetch stats when stats panel is opened (lazy load)
  // Also refresh stats when filters change while stats panel is open
  useEffect(() => {
    if (!showStats) {
      // Reset loaded flag when closing stats panel
      if (hasLoadedStats) {
        setHasLoadedStats(false)
        lastStatsFetchRef.current = null
      }
      return
    }

    // In favorites view, only use favorite IDs for stats
    if (showFavs) {
      const { getSelectedAnnotations } = useSelectedAnnotationsStore.getState()
      const favoriteAnnotations = getSelectedAnnotations()
      const favoriteIds = favoriteAnnotations.map((annotation: Annotation) => annotation.annotation_id)
      const statsFiltersKey = JSON.stringify({
        showFavs: true,
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
      selectedTaxons,
      selectedAssemblies,
      selectedBioprojects,
      selectedAssemblyLevels,
      selectedAssemblyStatuses,
      onlyRefGenomes,
      biotypes,
      featureTypes,
      pipelines,
      providers,
      databaseSources,
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
    showStats,
    showFavs,
    selectedTaxons,
    selectedAssemblies,
    selectedBioprojects,
    selectedAssemblyLevels,
    selectedAssemblyStatuses,
    onlyRefGenomes,
    biotypes,
    featureTypes,
    pipelines,
    providers,
    databaseSources,
    // Note: fetchAnnotationsStats and getSelectedAnnotations are stable Zustand functions
    // We exclude them from deps to prevent unnecessary re-runs
  ])

  const handleDownloadReport = async () => {
    try {
      setReportLoading(true)
      // Build filter payload similar to data fetching, but without pagination
      let favoriteIds: string[] = []
      if (showFavs) {
        try {
          const favs = getSelectedAnnotations()
          favoriteIds = (favs || []).map((a: any) => a.annotation_id).filter(Boolean)
        } catch {}
      }
      const params = buildParams(!!showFavs, favoriteIds)
      delete (params as any).limit
      delete (params as any).offset
      const blob = await downloadAnnotationsReport(params as any)
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `annotations_report.tsv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
      setReportOpen(false)
    } catch (e) {
      console.error(e)
    } finally {
      setReportLoading(false)
    }
  }

  // Parse sortOption into field and order
  const getSortFieldAndOrder = (option: SortOption): { field: string; order: 'asc' | 'desc' } => {
    if (option === 'none') return { field: 'none', order: 'desc' }
    const parts = option.split('_')
    const order = parts[parts.length - 1] as 'asc' | 'desc'
    const field = parts.slice(0, -1).join('_')
    return { field, order }
  }

  const { field: currentSortField, order: currentSortOrder } = getSortFieldAndOrder(sortOption)

  const sortFields: { value: string; label: string }[] = [
    { value: "none", label: "Sort by" },
    { value: "date", label: "Release date" },
    { value: "coding_genes_count", label: "Coding genes count" },
    { value: "non_coding_genes_count", label: "Non-coding genes count" },
    { value: "pseudogenes_count", label: "Pseudogenes count" },
  ]

  const handleSortFieldChange = (field: string) => {
    if (field === 'none') {
      setAnnotationsSortOption('none')
    } else {
      const newOption = `${field}_${currentSortOrder}` as SortOption
      setAnnotationsSortOption(newOption)
    }
  }

  const handleSortOrderToggle = () => {
    if (currentSortField === 'none') return
    const newOrder = currentSortOrder === 'asc' ? 'desc' : 'asc'
    const newOption = `${currentSortField}_${newOrder}` as SortOption
    setAnnotationsSortOption(newOption)
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

      {/* Toolbar Header */}
      <div className="flex-shrink-0 border-b border-border/60 bg-background/90 supports-[backdrop-filter]:bg-background/75 backdrop-blur">
        <div className="px-6 pt-3 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 gap-2"
                onClick={handleFiltersToggle}
                disabled={filtersButtonDisabled}
                aria-pressed={isSidebarOpen}
                title={
                  filtersButtonDisabled
                    ? 'Filters are hidden in favorites view'
                    : (isSidebarOpen ? 'Hide filters sidebar' : 'Show filters sidebar')
                }
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    Annotations
                  </h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  {loading
                    ? 'Fetching results…'
                    : totalAnnotations > 0
                      ? `${totalAnnotations.toLocaleString()} ${totalAnnotations === 1 ? 'result' : 'results'}`
                      : 'No results'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBrowseAssemblies}
                className="h-9 px-3 gap-2"
                title="Open assemblies browser"
              >
                <Database className="h-4 w-4" />
                Browse Assemblies
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportOpen(true)}
                className="h-9 px-3 gap-2"
                title="Download TSV report for current filters"
              >
                <FileText className="h-4 w-4" />
                Download TSV
              </Button>
              <Select value={currentSortField} onValueChange={handleSortFieldChange}>
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortFields.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSortOrderToggle}
                disabled={currentSortField === 'none'}
                className="h-9 px-3"
                title={currentSortField === 'none' ? 'Select a sort field first' : (currentSortOrder === 'asc' ? 'Ascending' : 'Descending')}
              >
                {currentSortOrder === 'asc' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </Button>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-6 py-4">
          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Download TSV report</DialogTitle>
                <DialogDescription>
                  This will generate a TSV report of the current annotation results based on your active filters.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="p-3 rounded-md border bg-muted/40">
                  <div className="font-medium text-foreground">Summary</div>
                  <ul className="mt-2 text-muted-foreground list-disc list-inside space-y-1">
                    <li>Total annotations in current result set: <span className="text-foreground font-semibold">{totalAnnotations.toLocaleString()}</span></li>
                  </ul>
                </div>
                <div className="p-3 rounded-md border bg-amber-50 dark:bg-amber-900/20">
                  <div className="font-medium text-foreground">About file URLs in the report</div>
                  <ul className="mt-2 text-amber-800 dark:text-amber-200 text-xs space-y-1">
                    <li><span className="font-semibold text-foreground">source_file_info.url_path</span>: direct link to the original source file provided by the data source.</li>
                    <li><span className="font-semibold text-foreground">indexed_file_info.bgzipped_path</span>: relative path of the file processed by Annotrieve (sorted, bgzipped, and indexed). To download, prepend <span className="font-mono text-foreground">https://genome.crg.es/annotrieve/files</span> to this path.</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReportOpen(false)} disabled={reportLoading}>
                  Cancel
                </Button>
                <Button onClick={handleDownloadReport} disabled={reportLoading} className="gap-2">
                  {reportLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {reportLoading ? 'Preparing…' : 'Download TSV'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Stats Panel - collapsible */}
          {showStats && (
            <div className="mb-6">
              <AnnotationsStatsDashboard stats={stats || null} loading={statsLoading} />
            </div>
          )}

          {/* Annotations List */}
          {allAnnotations.length === 0 && !loading && !loadingMore ? (
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
              {/* Annotations Grid */}
              <div className="grid gap-4">
                {allAnnotations.map((annotation) => (
                  <AnnotationCard
                    isSelected={isSelected(annotation.annotation_id || annotation.md5_checksum || '')}
                    key={annotation.annotation_id || annotation.md5_checksum || ''}
                    annotation={annotation as any}
                  />
                ))}
              </div>

              {/* Infinite Scroll Trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-4">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading more...</span>
                    </div>
                  )}
                </div>
              )}

              {/* End of results indicator */}
              {!hasMore && allAnnotations.length > 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  All {totalAnnotations.toLocaleString()} annotations loaded
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
