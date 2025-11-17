"use client"

import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from "react"
import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from "react"
import { Checkbox, Button, Label } from "@/components/ui"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, Loader2, ArrowRight } from "lucide-react"
import { getAssembliesStats } from "@/lib/api/assemblies"
import { getAnnotationsFrequencies } from "@/lib/api/annotations"
import { getTaxon, getTaxonRankFrequencies, listTaxons } from "@/lib/api/taxons"
import { useAnnotationsFiltersStore } from "@/lib/stores/annotations-filters"
import { AssemblyRecord, OrganismRecord, TaxonRecord } from "@/lib/api/types"
import { cn } from "@/lib/utils"
import { CompactTaxonomicTree } from "@/components/compact-taxonomic-tree"
import { createAssemblySearchModel, createOrganismSearchModel, createTaxonSearchModel } from "@/lib/search-models"
import { QuickSearchSection } from "@/components/annotations-sidebar-filters/components/quick-search-section"
import { FilterAccordionSection } from "@/components/annotations-sidebar-filters/components/filter-accordion-section"
import { sortRanks, formatRankLabel } from "@/components/annotations-sidebar-filters/utils"
import { useUIStore } from "@/lib/stores/ui"
import { CommonSearchResult } from "@/lib/types"

const FILTER_PARAM_EXCLUDE_MAP: Record<string, string> = {
  'biotype': 'biotypes',
  'feature-types': 'feature_types',
  'feature-sources': 'feature_sources',
  'pipelines': 'pipelines',
  'providers': 'providers',
  'database-sources': 'db_sources',
  'assembly-levels': 'assembly_levels',
  'assembly-statuses': 'assembly_statuses',
  'refseq-categories': 'refseq_categories'
}

const FILTER_FIELD_NAME_MAP: Record<string, string> = {
  'biotype': 'biotype',
  'feature-types': 'feature_type',
  'feature-sources': 'feature_source',
  'pipelines': 'pipeline',
  'providers': 'provider',
  'database-sources': 'database',
  'assembly-levels': 'assembly_level',
  'assembly-statuses': 'assembly_status',
  'refseq-categories': 'refseq_category'
}

const TAXON_SORT_PARAMS = {
  sort_by: 'annotations_count',
  sort_order: 'desc'
}

interface CollapsibleSectionProps {
  title: string
  description?: string
  isOpen: boolean
  onToggle: () => void
  isLoading?: boolean
  btnAction?: () => void
  btnText?: string
  icon?: ReactNode
  children: ReactNode
}

const COLLAPSIBLE_ANIMATION_DURATION = 300
const COLLAPSIBLE_SKELETON_WIDTHS = ["w-5/6", "w-full", "w-2/3"] as const

function usePersistentState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue
    try {
      const storedValue = window.localStorage.getItem(key)
      return storedValue !== null ? JSON.parse(storedValue) : defaultValue
    } catch (error) {
      console.warn(`Failed to read persistent state for ${key}:`, error)
      return defaultValue
    }
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn(`Failed to persist state for ${key}:`, error)
    }
  }, [key, value])

  return [value, setValue] as const
}

function CollapsibleSection({
  title,
  description,
  isOpen,
  onToggle,
  isLoading = false,
  btnAction,
  btnText,
  icon,
  children
}: CollapsibleSectionProps) {
  const contentId = `section-${title?.toString().toLowerCase().replace(/\s+/g, '-')}`
  const chevronLabel = `${isOpen ? "Collapse" : "Expand"} ${title ?? "section"} section`
  const [shouldRenderContent, setShouldRenderContent] = useState(isOpen)
  const [contentHeight, setContentHeight] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    if (isOpen) {
      setShouldRenderContent(true)
    } else {
      timeoutId = setTimeout(() => setShouldRenderContent(false), COLLAPSIBLE_ANIMATION_DURATION)
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!shouldRenderContent || !contentRef.current) return

    const node = contentRef.current
    const updateHeight = () => {
      setContentHeight(node.scrollHeight)
    }

    updateHeight()

    let resizeObserver: ResizeObserver | null = null
    let resizeListenerAttached = false

    const globalWindow = typeof window !== "undefined" ? window : undefined

    if (globalWindow && "ResizeObserver" in globalWindow) {
      resizeObserver = new ResizeObserver(() => updateHeight())
      resizeObserver.observe(node)
    } else if (globalWindow) {
      ;(globalWindow as any).addEventListener("resize", updateHeight)
      resizeListenerAttached = true
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect()
      } else if (resizeListenerAttached && globalWindow) {
        ;(globalWindow as any).removeEventListener("resize", updateHeight)
      }
    }
  }, [shouldRenderContent])

  const handleHeaderKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault()
      onToggle()
    }
  }, [onToggle])

  return (
    <div className="rounded-md border bg-card/60 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={handleHeaderKeyDown}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="group w-full flex items-center justify-between px-4 py-4 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-muted-foreground flex-shrink-0">{icon}</span>}
          <span className="text-sm font-semibold truncate">{title}</span>
        </div>
        <div className="text-muted-foreground transition-transform duration-200 ease-in-out group-hover:text-foreground">
          <ChevronDown
            className={`h-4 w-4 shrink-0 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
            role="img"
            aria-label={chevronLabel}
            focusable={false}
          />
        </div>
      </div>

      <div
        id={contentId}
        aria-hidden={!isOpen}
        className="border-t bg-muted/60 shadow-inner border-border/80 overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? `${contentHeight}px` : 0 }}
      >
        <div ref={contentRef} className="p-4 space-y-3">
          {shouldRenderContent && (
            <>
              {description && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                  {btnAction && (
                    <Button variant="link" className="text-accent text-xs px-0 h-auto" onClick={btnAction}>
                      {btnText}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              )}
              {isOpen && isLoading && (
                <div className="space-y-2 py-1" role="status" aria-live="polite">
                  {COLLAPSIBLE_SKELETON_WIDTHS.map((widthClass, index) => (
                    <div
                      key={`${widthClass}-${index}`}
                      className={`h-3 rounded bg-muted-foreground/30 animate-pulse ${widthClass}`}
                    />
                  ))}
                </div>
              )}
              <div className="space-y-3">
                {children}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function AnnotationsSidebarFilters() {
  const { openRightSidebar } = useUIStore()
  const store = useAnnotationsFiltersStore()
  const {
    selectedTaxons,
    selectedAssemblies,
    selectedAssemblyLevels,
    selectedAssemblyStatuses,
    onlyRefGenomes,
    biotypes,
    featureTypes,
    featureSources,
    pipelines,
    providers,
    databaseSources,
    setSelectedTaxons,
    setSelectedAssemblies,
    setSelectedAssemblyLevels,
    setSelectedAssemblyStatuses,
    setOnlyRefGenomes,
    setBiotypes,
    setFeatureTypes,
    setPipelines,
    setProviders,
    setDatabaseSources,
  } = store


  // Taxonomy section
  const [rankFrequencies, setRankFrequencies] = useState<Record<string, number>>({})
  const [loadingRanks, setLoadingRanks] = useState(false)
  const [selectedRank, setSelectedRank] = useState<string | null>(null)
  const [rankTaxons, setRankTaxons] = useState<TaxonRecord[]>([])
  const [loadingTaxons, setLoadingTaxons] = useState(false)
  const [loadingMoreTaxons, setLoadingMoreTaxons] = useState(false)
  const [hasMoreTaxons, setHasMoreTaxons] = useState(false)
  const [taxonsOffset, setTaxonsOffset] = useState(0)
  const [totalTaxons, setTotalTaxons] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const observerTargetRef = useRef<HTMLDivElement>(null)
  const quickSearchModels = useMemo(
    () => [
      createOrganismSearchModel(5),
      createTaxonSearchModel(5, { requireChildren: true }),
      createAssemblySearchModel(5),
    ],
    []
  )

  // Tree rank selection (separate from rank section)
  const [treeSelectedRank, setTreeSelectedRank] = useState<string | null>(null)
  const [treeRankRoots, setTreeRankRoots] = useState<TaxonRecord[]>([])
  const [loadingTreeRankRoots, setLoadingTreeRankRoots] = useState(false)
  const [treeRankRootsOffset, setTreeRankRootsOffset] = useState(0)
  const [hasMoreTreeRankRoots, setHasMoreTreeRankRoots] = useState(false)
  const [totalTreeRankRoots, setTotalTreeRankRoots] = useState(0)

  // Assembly filters - lazy loaded
  const [assemblyLevelOptions, setAssemblyLevelOptions] = useState<Record<string, number>>({})
  const [assemblyStatusOptions, setAssemblyStatusOptions] = useState<Record<string, number>>({})
  const [refseqCategoryOptions, setRefseqCategoryOptions] = useState<Record<string, number>>({})
  const [assemblyFiltersLoaded, setAssemblyFiltersLoaded] = useState(false)
  const [loadingAssemblyFilters, setLoadingAssemblyFilters] = useState(false)

  // Metadata filters - lazy loaded
  const [biotypeOptions, setBiotypeOptions] = useState<Record<string, number>>({})
  const [featureTypeOptions, setFeatureTypeOptions] = useState<Record<string, number>>({})
  const [pipelineOptions, setPipelineOptions] = useState<Record<string, number>>({})
  const [providerOptions, setProviderOptions] = useState<Record<string, number>>({})
  const [databaseSourcesOptions, setDatabaseSourcesOptions] = useState<Record<string, number>>({})
  const [featureSourceOptions, setFeatureSourceOptions] = useState<Record<string, number>>({})
  const [gffSummaryAccordionValue, setGffSummaryAccordionValue] = usePersistentState<string | null>("annotations-sidebar:gff-summary-open", null)
  const [gffSourceAccordionValue, setGffSourceAccordionValue] = usePersistentState<string | null>("annotations-sidebar:gff-source-open", null)
  const [loadingSection, setLoadingSection] = useState<string | null>(null)
  const [filterSectionSearchQueries, setFilterSectionSearchQueries] = useState<Record<string, string>>({})
  const [isTaxonomySectionOpen, setIsTaxonomySectionOpen] = usePersistentState<boolean>("annotations-sidebar:taxonomy-open", false)
  const [isAssemblySectionOpen, setIsAssemblySectionOpen] = usePersistentState<boolean>("annotations-sidebar:assemblies-open", false)

  const filterOptionSetters = useMemo<Record<string, (data: Record<string, number>) => void>>(
    () => ({
      'biotype': setBiotypeOptions,
      'feature-types': setFeatureTypeOptions,
      'feature-sources': setFeatureSourceOptions,
      'pipelines': setPipelineOptions,
      'providers': setProviderOptions,
      'database-sources': setDatabaseSourcesOptions,
      'assembly-levels': setAssemblyLevelOptions,
      'assembly-statuses': setAssemblyStatusOptions,
      'refseq-categories': setRefseqCategoryOptions
    }),
    [
      setBiotypeOptions,
      setFeatureTypeOptions,
      setFeatureSourceOptions,
      setPipelineOptions,
      setProviderOptions,
      setDatabaseSourcesOptions,
      setAssemblyLevelOptions,
      setAssemblyStatusOptions,
      setRefseqCategoryOptions
    ]
  )

  // Info modal
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)

  // Cache for filter options to avoid redundant API calls
  const filterCacheRef = useRef<Map<string, { data: Record<string, number>, timestamp: number }>>(new Map())
  const CACHE_TTL = 30000 // 30 seconds

  // Build params for filter fetching
  const buildFilterParams = useCallback((excludeField?: string) => {
    const params: Record<string, any> = {}

    if (selectedTaxons.length > 0) {
      params.taxids = selectedTaxons.map(t => t.taxid).join(',')
    }
    if (selectedAssemblies.length > 0) {
      params.assembly_accessions = selectedAssemblies.map(a => a.assembly_accession).join(',')
    }
    if (selectedAssemblyLevels.length > 0) {
      params.assembly_levels = selectedAssemblyLevels.join(',')
    }
    if (selectedAssemblyStatuses.length > 0) {
      params.assembly_statuses = selectedAssemblyStatuses.join(',')
    }
    if (onlyRefGenomes) {
      params.refseq_categories = 'reference genome'
    }
    if (biotypes.length > 0) {
      params.biotypes = biotypes.join(',')
    }
    if (featureTypes.length > 0) {
      params.feature_types = featureTypes.join(',')
    }
    if (featureSources.length > 0) {
      params.feature_sources = featureSources.join(',')
    }
    if (pipelines.length > 0) {
      params.pipelines = pipelines.join(',')
    }
    if (providers.length > 0) {
      params.providers = providers.join(',')
    }
    if (databaseSources.length > 0) {
      params.db_sources = databaseSources.join(',')
    }

    // Exclude the field being fetched to avoid circular dependency
    if (excludeField) {
      const paramToExclude = FILTER_PARAM_EXCLUDE_MAP[excludeField]
      if (paramToExclude) {
        delete params[paramToExclude]
      }
    }

    return params
  }, [
    selectedTaxons,
    selectedAssemblies,
    selectedAssemblyLevels,
    selectedAssemblyStatuses,
    onlyRefGenomes,
    biotypes,
    featureTypes,
    featureSources,
    pipelines,
    providers,
    databaseSources
  ])

  // Track pending loads to prevent duplicate requests
  const pendingLoadsRef = useRef<Set<string>>(new Set())

  // Debounce filter reloads when parent filters change
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadFilterOptions = useCallback(async (field: string, type: 'annotation' | 'assembly') => {
    // Check cache first
    const cacheKey = `${field}-${type}-${JSON.stringify(buildFilterParams(field))}`
    const cached = filterCacheRef.current.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      filterOptionSetters[field]?.(cached.data)
      return
    }

    // Prevent duplicate requests
    if (pendingLoadsRef.current.has(cacheKey)) return
    pendingLoadsRef.current.add(cacheKey)

    setLoadingSection(field)
    try {
      const params = buildFilterParams(field)
      const apiFieldName = FILTER_FIELD_NAME_MAP[field] || field

      let result: Record<string, number> = {}
      if (type === 'annotation') {
        result = await getAnnotationsFrequencies(apiFieldName, params).catch(() => ({}))
      } else {
        result = await getAssembliesStats(params, apiFieldName).catch(() => ({}))
      }

      // Cache the result
      filterCacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() })

      // Update state - only update if we got results (don't clear existing options)
      if (Object.keys(result).length > 0) {
        filterOptionSetters[field]?.(result)
      }
    } catch (error) {
      console.error(`Error fetching filter options for ${field}:`, error)
    } finally {
      setLoadingSection(null)
      pendingLoadsRef.current.delete(cacheKey)
    }
  }, [buildFilterParams, filterOptionSetters])

  // Load assembly filters once on mount (static, no parameters)
  useEffect(() => {
    if (!assemblyFiltersLoaded && !loadingAssemblyFilters) {
      setLoadingAssemblyFilters(true)

      // Fetch without any filter parameters (static frequencies)
      Promise.all([
        getAssembliesStats({}, 'assembly_level').catch(() => ({})),
        getAssembliesStats({}, 'assembly_status').catch(() => ({})),
        getAssembliesStats({}, 'refseq_category').catch(() => ({}))
      ]).then(([levels, statuses, refseq]) => {
        setAssemblyLevelOptions(levels || {})
        setAssemblyStatusOptions(statuses || {})
        setRefseqCategoryOptions(refseq || {})
        setAssemblyFiltersLoaded(true)
      }).catch((error) => {
        console.error('Error loading assembly filters:', error)
        setAssemblyFiltersLoaded(true)
      }).finally(() => {
        setLoadingAssemblyFilters(false)
      })
    }
  }, [assemblyFiltersLoaded, loadingAssemblyFilters])

  // Only reload metadata filters when parent filters (taxons/assemblies) change
  // NOT when metadata filters themselves change, and NOT when assembly filter properties change
  useEffect(() => {
    const openSection = gffSummaryAccordionValue || gffSourceAccordionValue
    if (!openSection) return

    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current)
    }

    reloadTimeoutRef.current = setTimeout(() => {
      // Clear cache for the open metadata section
      filterCacheRef.current.forEach((_, key) => {
        if (key === openSection) {
          filterCacheRef.current.delete(key)
        }
      })

      // Reload the open metadata section
      loadFilterOptions(openSection, 'annotation')
    }, 500) // 500ms debounce

    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current)
      }
    }
    // Only depend on taxons and assemblies (the actual records), NOT on filter properties or metadata filters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaxons, selectedAssemblies, gffSummaryAccordionValue, gffSourceAccordionValue, loadFilterOptions])

  // Load rank frequencies
  useEffect(() => {
    if (Object.keys(rankFrequencies).length === 0 && !loadingRanks) {
      setLoadingRanks(true)
      getTaxonRankFrequencies()
        .then(data => setRankFrequencies(data || {}))
        .catch(() => setRankFrequencies({}))
        .finally(() => setLoadingRanks(false))
    }
  }, [rankFrequencies, loadingRanks])

  // Load taxons when rank is selected
  useEffect(() => {
    if (!selectedRank) {
      setRankTaxons([])
      setHasMoreTaxons(false)
      setTaxonsOffset(0)
      setTotalTaxons(0)
      return
    }

    setLoadingTaxons(true)
    setTaxonsOffset(0)
    const limit = 50

    listTaxons({ rank: selectedRank, limit, offset: 0, ...TAXON_SORT_PARAMS })
      .then(response => {
        const results = (response as any)?.results || []
        const total = (response as any)?.total || 0
        setRankTaxons(results)
        setTotalTaxons(total)
        setHasMoreTaxons(results.length < total)
        setTaxonsOffset(results.length)
      })
      .catch(error => {
        console.error("Error loading taxons by rank:", error)
        setRankTaxons([])
        setHasMoreTaxons(false)
        setTotalTaxons(0)
      })
      .finally(() => setLoadingTaxons(false))
  }, [selectedRank])

  // Load more taxons for infinite scroll
  const loadMoreTaxons = useCallback(async () => {
    if (!selectedRank || loadingMoreTaxons || !hasMoreTaxons) return

    setLoadingMoreTaxons(true)
    const limit = 50

    try {
      const response = await listTaxons({ rank: selectedRank, limit, offset: taxonsOffset, ...TAXON_SORT_PARAMS })
      const results = (response as any)?.results || []
      const total = (response as any)?.total || 0

      setRankTaxons(prev => [...prev, ...results])
      setTaxonsOffset(prev => prev + results.length)
      setHasMoreTaxons(taxonsOffset + results.length < total)
    } catch (error) {
      console.error("Error loading more taxons:", error)
    } finally {
      setLoadingMoreTaxons(false)
    }
  }, [selectedRank, loadingMoreTaxons, hasMoreTaxons, taxonsOffset])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasMoreTaxons || !selectedRank) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreTaxons && !loadingMoreTaxons) {
          loadMoreTaxons()
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '50px',
        threshold: 0.1
      }
    )

    const currentTarget = observerTargetRef.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMoreTaxons, loadingMoreTaxons, loadMoreTaxons, selectedRank])

  // Fetch taxons by rank for tree when tree rank is selected
  useEffect(() => {
    if (!treeSelectedRank) {
      setTreeRankRoots([])
      setTreeRankRootsOffset(0)
      setHasMoreTreeRankRoots(false)
      setTotalTreeRankRoots(0)
      return
    }

    setLoadingTreeRankRoots(true)
    setTreeRankRootsOffset(0)
    const limit = 50

    listTaxons({ rank: treeSelectedRank, limit, offset: 0, ...TAXON_SORT_PARAMS })
      .then(response => {
        const results = (response as any)?.results || []
        const total = (response as any)?.total || 0
        setTreeRankRoots(results)
        setTotalTreeRankRoots(total)
        setHasMoreTreeRankRoots(results.length < total)
        setTreeRankRootsOffset(results.length)
      })
      .catch(error => {
        console.error("Error loading taxons by rank for tree:", error)
        setTreeRankRoots([])
        setHasMoreTreeRankRoots(false)
        setTotalTreeRankRoots(0)
      })
      .finally(() => setLoadingTreeRankRoots(false))
  }, [treeSelectedRank])

  // Load more tree rank roots for infinite scroll
  const loadMoreTreeRankRoots = useCallback(async () => {
    if (!treeSelectedRank || loadingTreeRankRoots || !hasMoreTreeRankRoots) return

    setLoadingTreeRankRoots(true)
    const limit = 50

    try {
      const response = await listTaxons({ rank: treeSelectedRank, limit, offset: treeRankRootsOffset, ...TAXON_SORT_PARAMS })
      const results = (response as any)?.results || []
      const total = (response as any)?.total || 0

      // Deduplicate by taxid
      setTreeRankRoots(prev => {
        const existingTaxids = new Set(prev.map(r => r.taxid))
        const uniqueNew = results.filter((r: TaxonRecord) => !existingTaxids.has(r.taxid))
        return [...prev, ...uniqueNew]
      })

      setTreeRankRootsOffset(prev => prev + results.length)
      setHasMoreTreeRankRoots(treeRankRootsOffset + results.length < total)
    } catch (error) {
      console.error("Error loading more taxons by rank for tree:", error)
    } finally {
      setLoadingTreeRankRoots(false)
    }
  }, [treeSelectedRank, loadingTreeRankRoots, hasMoreTreeRankRoots, treeRankRootsOffset])

  const handleGffSummaryAccordionChange = (value?: string) => {
    const nextValue = value ?? null

    if (!nextValue && gffSummaryAccordionValue) {
      setFilterSectionSearchQueries(prev => {
        const updated = { ...prev }
        delete updated[gffSummaryAccordionValue]
        return updated
      })
    }

    setGffSummaryAccordionValue(nextValue)
    if (nextValue) {
      loadFilterOptions(nextValue, 'annotation')
    }
  }

  const summaryFilterSections = useMemo(
    () => [
      {
        key: "biotype",
        title: "Biotypes",
        description: "Biological types (e.g., protein_coding, lncRNA)",
        options: biotypeOptions,
        selected: biotypes,
        onChange: setBiotypes
      },
      {
        key: "feature-types",
        title: "Feature Types",
        description: "Genomic feature types (e.g., gene, transcript, exon)",
        options: featureTypeOptions,
        selected: featureTypes,
        onChange: setFeatureTypes
      },
    ],
    [biotypeOptions, biotypes, setBiotypes, featureTypeOptions, featureTypes, setFeatureTypes]
  )

  const sourceMetadataSections = useMemo(
    () => [
      {
        key: "pipelines",
        title: "Pipelines",
        description: "Annotation pipelines used to generate the annotations",
        options: pipelineOptions,
        selected: pipelines,
        onChange: setPipelines
      },
      {
        key: "providers",
        title: "Providers",
        description: "Data providers that supplied the annotations",
        options: providerOptions,
        selected: providers,
        onChange: setProviders
      },
      {
        key: "database-sources",
        title: "Database Sources",
        description: "Source databases (e.g., RefSeq, Ensembl, GenBank)",
        options: databaseSourcesOptions,
        selected: databaseSources,
        onChange: setDatabaseSources
      }
    ],
    [pipelineOptions, pipelines, setPipelines, providerOptions, providers, setProviders, databaseSourcesOptions, databaseSources, setDatabaseSources]
  )

  const handleGffSourceAccordionChange = (value?: string) => {
    const nextValue = value ?? null

    if (!nextValue && gffSourceAccordionValue) {
      setFilterSectionSearchQueries(prev => {
        const updated = { ...prev }
        delete updated[gffSourceAccordionValue]
        return updated
      })
    }

    setGffSourceAccordionValue(nextValue)
    if (nextValue) {
      loadFilterOptions(nextValue, 'annotation')
    }
  }

  const sortedRanks = sortRanks(rankFrequencies)


  const handleTaxonToggle = useCallback((taxon: TaxonRecord) => {
    if (selectedTaxons.some(t => t.taxid === taxon.taxid)) {
      setSelectedTaxons(selectedTaxons.filter(t => t.taxid !== taxon.taxid))
    } else {
      setSelectedTaxons([...selectedTaxons, taxon])
    }
  }, [selectedTaxons, setSelectedTaxons])

  const handleQuickSearchSelect = useCallback(
    async (result: CommonSearchResult<AssemblyRecord | TaxonRecord | OrganismRecord>) => {
      if (result.modelKey === "assembly") {
        const assembly = result.data as AssemblyRecord
        if (!selectedAssemblies.find((a) => a.assembly_accession === assembly.assembly_accession)) {
          setSelectedAssemblies([...selectedAssemblies, assembly])
        }
      }
      else {
        // map organism to taxon for filtering
        const taxon = result.modelKey === "taxon" ? result.data as TaxonRecord : await getTaxon(result.data.taxid)
        if (!selectedTaxons.find((t) => t.taxid === taxon.taxid)) {
          setSelectedTaxons([...selectedTaxons, taxon])
        }
      }
    },
    [selectedAssemblies, selectedTaxons, setSelectedAssemblies, setSelectedTaxons]
  )

  return (
    <>
      <div className="w-full border-r bg-background h-full flex flex-col">
        <QuickSearchSection
          models={quickSearchModels}
          onSelect={handleQuickSearchSelect}
        />
        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Taxonomy Section */}
          <CollapsibleSection
            title="Taxonomy"
            description="Browse and select ranks or individual taxons."
            isOpen={isTaxonomySectionOpen}
            onToggle={() => setIsTaxonomySectionOpen((prev) => !prev)}
            isLoading={loadingRanks && treeRankRoots.length === 0}
          >
            <div className="space-y-4">
              {/* Rank Selection */}
              <div className="flex items-center gap-3">
                <Select
                  value={treeSelectedRank || 'all'}
                  onValueChange={(value) => setTreeSelectedRank(value === 'all' ? null : value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Filter by rank" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    <SelectItem value="all">Filter by rank</SelectItem>
                    {sortedRanks.map(([rank, count]) => (
                      <SelectItem key={rank} value={rank}>
                        {formatRankLabel(rank)} ({count.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tree Component */}
              {loadingTreeRankRoots && treeRankRoots.length === 0 ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-xs text-muted-foreground">Loading taxons...</span>
                </div>
              ) : (
                <CompactTaxonomicTree
                  rootTaxid="2759"
                  rankRoots={treeSelectedRank ? treeRankRoots : undefined}
                  selectedTaxons={selectedTaxons}
                  onTaxonToggle={handleTaxonToggle}
                  maxHeight="350px"
                  loadingRankRoots={loadingTreeRankRoots}
                  hasMoreRankRoots={hasMoreTreeRankRoots}
                  onLoadMore={loadMoreTreeRankRoots}
                />
              )}
            </div>
          </CollapsibleSection>

          {/* Assembly Filters */}
          <CollapsibleSection
            title="Assemblies"
            description="Limit annotations by assembly metadata."
            isOpen={isAssemblySectionOpen}
            onToggle={() => setIsAssemblySectionOpen((prev) => !prev)}
            isLoading={loadingAssemblyFilters}
          >
            {loadingAssemblyFilters ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Reference Genomes */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">Reference genomes only</Label>
                  <button
                    onClick={() => setOnlyRefGenomes(!onlyRefGenomes)}
                    className={cn(
                      "relative inline-flex h-6 w-12 items-center rounded-full border transition-colors",
                      onlyRefGenomes ? "bg-primary border-primary" : "bg-muted border-border"
                    )}
                    role="switch"
                    aria-checked={onlyRefGenomes}
                  >
                    <span
                      className={cn(
                        "inline-block h-5 w-5 rounded-full bg-background shadow transition-transform",
                        onlyRefGenomes ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
                {/* Assembly Levels */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">Assembly Levels</Label>
                  <div className="space-y-3">
                    {Object.keys(assemblyLevelOptions)
                      .filter(k => k !== 'no_value')
                      .sort()
                      .map((level) => (
                        <div key={level} className="flex items-center space-x-2">
                          <Checkbox
                            id={`assembly-level-${level}`}
                            checked={selectedAssemblyLevels.includes(level)}
                            onCheckedChange={() => {
                              if (selectedAssemblyLevels.includes(level)) {
                                setSelectedAssemblyLevels(selectedAssemblyLevels.filter(l => l !== level))
                              } else {
                                setSelectedAssemblyLevels([...selectedAssemblyLevels, level])
                              }
                            }}
                          />
                          <Label
                            htmlFor={`assembly-level-${level}`}
                            className="text-sm cursor-pointer"
                          >
                            {level}
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Assembly Statuses */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">Assembly Statuses</Label>
                  <div className="space-y-3">
                    {Object.keys(assemblyStatusOptions)
                      .filter(k => k !== 'no_value')
                      .sort()
                      .map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`assembly-status-${status}`}
                            checked={selectedAssemblyStatuses.includes(status)}
                            onCheckedChange={() => {
                              if (selectedAssemblyStatuses.includes(status)) {
                                setSelectedAssemblyStatuses(selectedAssemblyStatuses.filter(s => s !== status))
                              } else {
                                setSelectedAssemblyStatuses([...selectedAssemblyStatuses, status])
                              }
                            }}
                          />
                          <Label
                            htmlFor={`assembly-status-${status}`}
                            className="text-sm cursor-pointer"
                          >
                            {status}
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </CollapsibleSection>

          {sourceMetadataSections.map((section) => {
            const isOpen = gffSourceAccordionValue === section.key
            const isSectionLoading = loadingSection === section.key
            return (
              <CollapsibleSection
                key={section.key}
                title={section.title}
                isOpen={isOpen}
                description={section.description}
                onToggle={() => handleGffSourceAccordionChange(isOpen ? undefined : section.key)}
                isLoading={isSectionLoading}
              >
                <FilterAccordionSection
                  title={section.title}
                  description={section.description}
                  options={section.options}
                  selected={section.selected}
                  onChange={section.onChange}
                  isLoading={isSectionLoading}
                  isOpen={isOpen}
                  onToggle={() => handleGffSourceAccordionChange(isOpen ? undefined : section.key)}
                  searchQuery={filterSectionSearchQueries[section.key] || ""}
                  onSearchChange={(value) =>
                    setFilterSectionSearchQueries((prev) => ({ ...prev, [section.key]: value }))
                  }
                  useExternalToggle
                />
              </CollapsibleSection>
            )
          })}
          {summaryFilterSections.map((section) => {
            const isOpen = gffSummaryAccordionValue === section.key
            const isSectionLoading = loadingSection === section.key
            return (
              <CollapsibleSection
                key={section.key}
                title={section.title}
                isOpen={isOpen}
                description={section.description}
                onToggle={() => handleGffSummaryAccordionChange(isOpen ? undefined : section.key)}
                isLoading={isSectionLoading}
              >
                <FilterAccordionSection
                  title={section.title}
                  description={section.description}
                  options={section.options}
                  selected={section.selected}
                  onChange={section.onChange}
                  isLoading={isSectionLoading}
                  isOpen={isOpen}
                  onToggle={() => handleGffSummaryAccordionChange(isOpen ? undefined : section.key)}
                  searchQuery={filterSectionSearchQueries[section.key] || ""}
                  onSearchChange={(value) =>
                    setFilterSectionSearchQueries((prev) => ({ ...prev, [section.key]: value }))
                  }
                  useExternalToggle
                />
              </CollapsibleSection>
            )
          })}


        </div>
      </div>

    </>
  )
}
