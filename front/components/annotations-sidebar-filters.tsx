"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { X, Network, Database, Sparkles, Search, Info, FilterX } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { listTaxons, getTaxon } from "@/lib/api/taxons"
import { listAssemblies, getAssembliesStats, getAssembly } from "@/lib/api/assemblies"
import { getAnnotationsFrequencies } from "@/lib/api/annotations"
import type { TaxonRecord, AssemblyRecord } from "@/lib/api/types"
import { TaxonTab } from "@/components/annotations-sidebar-filters/taxon-tab"
import { AssemblyTab } from "@/components/annotations-sidebar-filters/assembly-tab"
import { MetadataTab } from "@/components/annotations-sidebar-filters/metadata-tab"
import { useAnnotationsFiltersStore } from "@/lib/stores/annotations-filters"

interface AnnotationsSidebarFiltersProps {
  // Optional close handler for mobile
  onClose?: () => void
}

export function AnnotationsSidebarFilters({
  onClose
}: AnnotationsSidebarFiltersProps) {
  // Use store for filters
  const store = useAnnotationsFiltersStore()
  const {
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
    setSelectedTaxids,
    setSelectedAssemblyAccessions,
    setSelectedAssemblyLevels,
    setSelectedAssemblyStatuses,
    setSelectedRefseqCategories,
    setBiotypes,
    setFeatureTypes,
    setPipelines,
    setProviders,
    setSource,
    setMostRecentPerSpecies,
    clearAllFilters,
    buildAnnotationsParams,
    browseAssemblies,
    fetchBrowseAssemblies,
    setBrowseAssembliesPage,
    setBrowseAssembliesSort,
    resetBrowseAssembliesPage,
  } = store
  
  const [activeTab, setActiveTab] = useState<"taxon" | "assembly" | "metadata">("taxon")
  
  // Reset browse assemblies page when filters change
  // This ensures that when the user switches to the assembly tab, they start at page 1 with the new filters
  useEffect(() => {
    resetBrowseAssembliesPage()
  }, [selectedTaxids, selectedAssemblyLevels, selectedAssemblyStatuses, selectedRefseqCategories, resetBrowseAssembliesPage])

  // Taxon search
  const [taxonSearchQuery, setTaxonSearchQuery] = useState("")
  const [taxonSearchResults, setTaxonSearchResults] = useState<TaxonRecord[]>([])
  const [taxonSearchLoading, setTaxonSearchLoading] = useState(false)
  const [selectedTaxons, setSelectedTaxons] = useState<TaxonRecord[]>([])

  // Assembly search
  const [assemblySearchQuery, setAssemblySearchQuery] = useState("")
  const [assemblySearchResults, setAssemblySearchResults] = useState<AssemblyRecord[]>([])
  const [assemblySearchLoading, setAssemblySearchLoading] = useState(false)
  const [selectedAssemblies, setSelectedAssemblies] = useState<AssemblyRecord[]>([])

  // Filter options with counts
  const [biotypeOptions, setBiotypeOptions] = useState<Record<string, number>>({})
  const [featureTypeOptions, setFeatureTypeOptions] = useState<Record<string, number>>({})
  const [pipelineOptions, setPipelineOptions] = useState<Record<string, number>>({})
  const [providerOptions, setProviderOptions] = useState<Record<string, number>>({})
  const [sourceOptions, setSourceOptions] = useState<Record<string, number>>({})
  const [assemblyLevelOptions, setAssemblyLevelOptions] = useState<Record<string, number>>({})
  const [assemblyStatusOptions, setAssemblyStatusOptions] = useState<Record<string, number>>({})
  const [refseqCategoryOptions, setRefseqCategoryOptions] = useState<Record<string, number>>({})

  // Track which sections have been loaded
  const [loadedSections, setLoadedSections] = useState<Set<string>>(new Set())
  // Track which section is currently loading
  const [loadingSection, setLoadingSection] = useState<string | null>(null)

  // Accordion state for metadata tab
  const [metadataAccordionValue, setMetadataAccordionValue] = useState<string | undefined>(undefined)
  // Accordion state for assembly tab
  const [assemblyAccordionValue, setAssemblyAccordionValue] = useState<string | undefined>(undefined)
  // Expanded nodes for taxonomic tree
  const [expandedTaxonNodes, setExpandedTaxonNodes] = useState<Set<string>>(new Set())

  // Browse assemblies state from store
  const {
    assemblies: browseAssembliesList,
    total: browseAssembliesTotal,
    loading: browseAssembliesLoading,
    page: browseAssembliesPage,
    itemsPerPage: browseAssembliesItemsPerPage,
    sortBy: browseAssembliesSortBy,
    sortOrder: browseAssembliesSortOrder,
  } = browseAssemblies

  // Search queries for filter sections (keyed by section key)
  const [filterSectionSearchQueries, setFilterSectionSearchQueries] = useState<Record<string, string>>({})

  // Info modal state
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)

  // Build filter params for API calls
  const buildFilterParams = () => {
    const params = buildAnnotationsParams()

    // Apply most recent per species filter to options as well
    if (mostRecentPerSpecies) {
      params.latest_release_by = 'organism'
    }

    // Add current filters to get accurate counts
    if (selectedTaxids.length > 0) {
      params.taxids = selectedTaxids.join(',')
    }
    if (selectedAssemblyAccessions.length > 0) {
      params.assembly_accessions = selectedAssemblyAccessions.join(',')
    }
    if (biotypes.length > 0) {
      params.biotypes = biotypes.join(',')
    }
    if (featureTypes.length > 0) {
      params.feature_types = featureTypes.join(',')
    }
    if (pipelines.length > 0) {
      params.pipelines = pipelines.join(',')
    }
    if (providers.length > 0) {
      params.providers = providers.join(',')
    }
    if (source && source !== "all") {
      params.db_sources = source
    }

    return params
  }

  // Build assembly params for assembly metadata frequencies
  const buildAssemblyParams = () => {
    const assemblyParams: Record<string, any> = {}
    if (selectedTaxids.length > 0) {
      assemblyParams.taxids = selectedTaxids.join(',')
    }
    if (selectedAssemblyAccessions.length > 0) {
      assemblyParams.assembly_accessions = selectedAssemblyAccessions.join(',')
    }
    return assemblyParams
  }

  // Lazy load filter options when accordion section is opened
  // Always fetches with current filter values to ensure data is up-to-date
  const loadFilterOptions = async (field: string, type: 'annotation' | 'assembly') => {
    setLoadingSection(field)
    try {
      const params = buildFilterParams()
      const assemblyParams = buildAssemblyParams()

      let result: Record<string, number> = {}

      if (type === 'annotation') {
        // Map field names to API field names
        const fieldMap: Record<string, string> = {
          'biotypes': 'biotype',
          'feature-types': 'feature_type',
          'pipelines': 'pipeline',
          'providers': 'provider',
          'sources': 'database'
        }
        const apiField = fieldMap[field] || field
        result = await getAnnotationsFrequencies(apiField, params).catch(() => ({}))
      } else if (type === 'assembly') {
        const fieldMap: Record<string, string> = {
          'assembly-levels': 'assembly_level',
          'assembly-statuses': 'assembly_status',
          'refseq-categories': 'refseq_category'
        }
        const apiField = fieldMap[field] || field
        result = await getAssembliesStats(assemblyParams, apiField).catch(() => ({}))
      }

      // Update the appropriate state
      switch (field) {
        case 'biotypes':
          setBiotypeOptions(result)
          break
        case 'feature-types':
          setFeatureTypeOptions(result)
          break
        case 'pipelines':
          setPipelineOptions(result)
          break
        case 'providers':
          setProviderOptions(result)
          break
        case 'sources':
          setSourceOptions(result)
          break
        case 'assembly-levels':
          setAssemblyLevelOptions(result)
          break
        case 'assembly-statuses':
          setAssemblyStatusOptions(result)
          break
        case 'refseq-categories':
          setRefseqCategoryOptions(result)
          break
      }

      // Mark section as loaded
      setLoadedSections(prev => new Set(prev).add(field))
    } catch (error) {
      console.error(`Error fetching filter options for ${field}:`, error)
    } finally {
      setLoadingSection(null)
    }
  }

  // Handle accordion value change and trigger lazy loading
  const handleMetadataAccordionChange = (value: string | undefined) => {
    // Clear search query for the previously open section when closing
    if (!value && metadataAccordionValue) {
      setFilterSectionSearchQueries(prev => {
        const updated = { ...prev }
        delete updated[metadataAccordionValue]
        return updated
      })
    }
    setMetadataAccordionValue(value)
    if (value) {
      // Always fetch with current filter values when opening a section
      loadFilterOptions(value, 'annotation')
    }
  }

  const handleAssemblyAccordionChange = (value: string | undefined) => {
    // Clear search query for the previously open section when closing
    if (!value && assemblyAccordionValue) {
      setFilterSectionSearchQueries(prev => {
        const updated = { ...prev }
        delete updated[assemblyAccordionValue]
        return updated
      })
    }
    setAssemblyAccordionValue(value)
    if (value) {
      // Always fetch with current filter values when opening a section
      loadFilterOptions(value, 'assembly')
    }
  }

  // Map sections to their corresponding filter state
  const getSectionFilterKey = (section: string): string | null => {
    const sectionFilterMap: Record<string, string> = {
      'biotypes': 'biotypes',
      'feature-types': 'featureTypes',
      'pipelines': 'pipelines',
      'providers': 'providers',
      'sources': 'source',
      'assembly-levels': 'selectedAssemblyLevels',
      'assembly-statuses': 'selectedAssemblyStatuses',
      'refseq-categories': 'selectedRefseqCategories'
    }
    return sectionFilterMap[section] || null
  }

  // Track previous filter values to detect which filter changed
  const prevFiltersRef = useRef({
    selectedTaxids: selectedTaxids,
    selectedAssemblyAccessions: selectedAssemblyAccessions,
    biotypes: biotypes,
    featureTypes: featureTypes,
    pipelines: pipelines,
    providers: providers,
    source: source,
    selectedAssemblyLevels: selectedAssemblyLevels,
    selectedAssemblyStatuses: selectedAssemblyStatuses,
    selectedRefseqCategories: selectedRefseqCategories,
    mostRecentPerSpecies: mostRecentPerSpecies
  })

  // Track if this is the first render
  const isFirstRender = useRef(true)

  // Reload only the currently open section when filters change (but not if the change is to that section's own filter)
  useEffect(() => {
    // Determine which filters changed
    const currentFilters = {
      selectedTaxids,
      selectedAssemblyAccessions,
      biotypes,
      featureTypes,
      pipelines,
      providers,
      source,
      selectedAssemblyLevels,
      selectedAssemblyStatuses,
      selectedRefseqCategories,
      mostRecentPerSpecies
    }

    const changedFilters = Object.keys(currentFilters).filter(key => {
      const current = currentFilters[key as keyof typeof currentFilters]
      const previous = prevFiltersRef.current[key as keyof typeof prevFiltersRef.current]
      if (Array.isArray(current) && Array.isArray(previous)) {
        return JSON.stringify(current) !== JSON.stringify(previous)
      }
      return current !== previous
    })

    // Update ref for next comparison
    prevFiltersRef.current = currentFilters

    // Skip reload on first render
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // If no filters changed, don't reload
    if (changedFilters.length === 0) {
      return
    }

    // Reload metadata section if one is open, but NOT if the user is only selecting values in that section
    if (metadataAccordionValue) {
      const sectionFilterKey = getSectionFilterKey(metadataAccordionValue)

      // Don't reload if ONLY this section's filter changed (user is selecting values in this section)
      // Otherwise, reload to update counts based on other filter changes
      const onlyThisSectionChanged = sectionFilterKey &&
        changedFilters.length === 1 &&
        changedFilters[0] === sectionFilterKey

      if (!onlyThisSectionChanged) {
        loadFilterOptions(metadataAccordionValue, 'annotation')
      }
    }

    // Reload assembly section if one is open, but NOT if the user is only selecting values in that section
    if (assemblyAccordionValue) {
      const sectionFilterKey = getSectionFilterKey(assemblyAccordionValue)

      // Don't reload if ONLY this section's filter changed (user is selecting values in this section)
      // Otherwise, reload to update counts based on other filter changes
      const onlyThisSectionChanged = sectionFilterKey &&
        changedFilters.length === 1 &&
        changedFilters[0] === sectionFilterKey

      if (!onlyThisSectionChanged) {
        loadFilterOptions(assemblyAccordionValue, 'assembly')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaxids, selectedAssemblyAccessions, biotypes, featureTypes, pipelines, providers, source, selectedAssemblyLevels, selectedAssemblyStatuses, selectedRefseqCategories, mostRecentPerSpecies, metadataAccordionValue, assemblyAccordionValue])

  // Search taxons
  useEffect(() => {
    let cancelled = false
    const timeoutId = setTimeout(async () => {
      if (taxonSearchQuery.trim().length < 2) {
        setTaxonSearchResults([])
        return
      }

      setTaxonSearchLoading(true)
      try {
        const results = await listTaxons({
          filter: taxonSearchQuery,
          limit: 10
        })
        if (!cancelled) {
          setTaxonSearchResults(results.results || [])
        }
      } catch (error) {
        console.error("Error searching taxons:", error)
        if (!cancelled) {
          setTaxonSearchResults([])
        }
      } finally {
        if (!cancelled) {
          setTaxonSearchLoading(false)
        }
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [taxonSearchQuery])

  // Search assemblies
  useEffect(() => {
    let cancelled = false
    const timeoutId = setTimeout(async () => {
      if (assemblySearchQuery.trim().length < 2) {
        setAssemblySearchResults([])
        return
      }

      setAssemblySearchLoading(true)
      try {
        const results = await listAssemblies({
          filter: assemblySearchQuery,
          limit: 10
        })
        if (!cancelled) {
          setAssemblySearchResults(results.results || [])
        }
      } catch (error) {
        console.error("Error searching assemblies:", error)
        if (!cancelled) {
          setAssemblySearchResults([])
        }
      } finally {
        if (!cancelled) {
          setAssemblySearchLoading(false)
        }
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [assemblySearchQuery])

  // Load selected taxons
  useEffect(() => {
    async function loadSelectedTaxons() {
      if (selectedTaxids.length === 0) {
        setSelectedTaxons([])
        return
      }

      try {
        const taxons = await Promise.all(
          selectedTaxids.map(taxid =>
            getTaxon(taxid).catch(() => null)
          )
        )
        setSelectedTaxons(taxons.filter((t): t is TaxonRecord => t !== null))
      } catch (error) {
        console.error("Error loading selected taxons:", error)
      }
    }
    loadSelectedTaxons()
  }, [selectedTaxids])

  // Load selected assemblies
  useEffect(() => {
    async function loadSelectedAssemblies() {
      if (selectedAssemblyAccessions.length === 0) {
        setSelectedAssemblies([])
        return
      }

      try {
        const assemblies = await Promise.all(
          selectedAssemblyAccessions.map(accession =>
            getAssembly(accession).catch(() => null)
          )
        )
        setSelectedAssemblies(assemblies.filter((a): a is AssemblyRecord => a !== null))
      } catch (error) {
        console.error("Error loading selected assemblies:", error)
      }
    }
    loadSelectedAssemblies()
  }, [selectedAssemblyAccessions])

  // Track the last assemblies fetch to prevent duplicates
  const lastAssembliesFetchRef = useRef<string | null>(null)
  
  // Reset page when filters change (but not when page changes)
  // Fetch browse assemblies only when assembly tab is active
  useEffect(() => {
    // Only fetch when assembly tab is active
    if (activeTab !== "assembly") {
      return
    }
    
    // Create a unique key for this fetch based on all relevant parameters
    const fetchKey = JSON.stringify({
      selectedTaxids,
      selectedAssemblyLevels,
      selectedAssemblyStatuses,
      selectedRefseqCategories,
      browseAssembliesPage,
      browseAssembliesSortBy,
      browseAssembliesSortOrder,
    })
    
    // Skip if this exact fetch was already initiated
    if (lastAssembliesFetchRef.current === fetchKey) {
      return
    }
    
    lastAssembliesFetchRef.current = fetchKey
    
    // Fetch assemblies (store's fetchBrowseAssemblies handles loading state and prevents duplicate fetches)
    fetchBrowseAssemblies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab, // Add activeTab as a dependency
    selectedTaxids,
    selectedAssemblyLevels,
    selectedAssemblyStatuses,
    selectedRefseqCategories,
    browseAssembliesPage,
    browseAssembliesSortBy,
    browseAssembliesSortOrder,
    // Note: fetchBrowseAssemblies is a stable Zustand function
    // We exclude it from deps to prevent unnecessary re-runs, but it's safe to use
  ])

  const handleTaxonSelect = (taxon: TaxonRecord) => {
    if (!selectedTaxids.includes(taxon.taxid)) {
      setSelectedTaxids([...selectedTaxids, taxon.taxid])
    }
    setTaxonSearchQuery("")
    setTaxonSearchResults([])
  }

  const handleTaxonRemove = (taxid: string) => {
    setSelectedTaxids(selectedTaxids.filter(id => id !== taxid))
  }

  const handleTaxonToggle = (taxid: string) => {
    if (selectedTaxids.includes(taxid)) {
      setSelectedTaxids(selectedTaxids.filter(id => id !== taxid))
    } else {
      setSelectedTaxids([...selectedTaxids, taxid])
    }
  }

  const handleAssemblySelect = (assembly: AssemblyRecord) => {
    const accession = assembly.assembly_accession
    if (selectedAssemblyAccessions.includes(accession)) {
      // Deselect if already selected
      setSelectedAssemblyAccessions(selectedAssemblyAccessions.filter(a => a !== accession))
    } else {
      // Select if not selected
      setSelectedAssemblyAccessions([...selectedAssemblyAccessions, accession])
    }
    setAssemblySearchQuery("")
    setAssemblySearchResults([])
  }

  const handleAssemblyRemove = (accession: string) => {
    setSelectedAssemblyAccessions(selectedAssemblyAccessions.filter(acc => acc !== accession))
  }

  const handleCheckboxChange = (
    value: string,
    selected: string[],
    onChange: (values: string[]) => void
  ) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const hasActiveFilters = store.hasActiveFilters()

  const renderFilterSection = (
    title: string,
    options: Record<string, number>,
    selected: string[],
    onChange: (values: string[]) => void,
    key: string,
    isLoading: boolean
  ) => {
    const sortedOptions = Object.entries(options)
      .filter(([key]) => key !== 'no_value')
      .sort((a, b) => b[1] - a[1])

    const searchQuery = filterSectionSearchQueries[key] || ""
    const filteredOptions = sortedOptions.filter(([option]) =>
      option.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const showSearch = sortedOptions.length > 20

    const handleSearchChange = (value: string) => {
      setFilterSectionSearchQueries(prev => ({
        ...prev,
        [key]: value
      }))
    }

    return (
      <AccordionItem value={key} className="border-b">
        <AccordionTrigger className="py-3 text-sm font-medium">
          <div className="flex items-center justify-between w-full mr-2">
            <span>{title}</span>
            <div className="flex items-center gap-2">
              {isLoading && (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
              {selected.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selected.length}
                </Badge>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {isLoading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Loading options...
            </div>
          ) : sortedOptions.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No options available
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search bar - only show if more than 20 options */}
              {showSearch && (
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search options..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              )}

              {/* Options list */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No options match your search
                  </div>
                ) : (
                  filteredOptions.map(([option, count]) => (
                    <div key={option} className="flex items-center space-x-3 py-1">
                      <Checkbox
                        id={`${key}-${option}`}
                        checked={selected.includes(option)}
                        onCheckedChange={() => handleCheckboxChange(option, selected, onChange)}
                      />
                      <Label
                        htmlFor={`${key}-${option}`}
                        className="flex-1 text-sm cursor-pointer flex items-center justify-between"
                      >
                        <span className="flex-1">{option}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {count.toLocaleString()}
                        </span>
                      </Label>
                    </div>
                  ))
                )}
              </div>

              {/* Show count of filtered results if search is active */}
              {showSearch && searchQuery && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Showing {filteredOptions.length} of {sortedOptions.length} options
                </div>
              )}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    )
  }

  return (
    <>
      <div className="w-full border-r bg-background h-full flex flex-col">
        {/* Header */}
        <div className="space-y-0">
          {/* Title Row */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                {onClose && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClose}
                    className="h-7 w-7 p-0 -ml-2"
                    title="Close filters"
                  >
                    <FilterX className="h-4 w-4" />
                  </Button>
                )}
                {!onClose && <FilterX className="h-4 w-4" />}
                Filters
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsInfoModalOpen(true)}
                className="h-7 w-7 p-0"
                title="View guidelines"
              >
                <Info className="h-4 w-4" />
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 border-b border-border flex-shrink-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3 h-9 bg-transparent p-0 gap-0">
                <TabsTrigger 
                  value="taxon" 
                  className="gap-2 h-9 px-3 rounded-none border-b-2 border-transparent font-medium text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-transparent"
                >
                  <Network className="h-4 w-4" />
                  Taxon
                </TabsTrigger>
                <TabsTrigger 
                  value="assembly" 
                  className="gap-2 h-9 px-3 rounded-none border-b-2 border-transparent font-medium text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-transparent"
                >
                  <Database className="h-4 w-4" />
                  Assembly
                </TabsTrigger>
                <TabsTrigger 
                  value="metadata" 
                  className="gap-2 h-9 px-3 rounded-none border-b-2 border-transparent font-medium text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground hover:text-foreground hover:bg-transparent"
                >
                  <Sparkles className="h-4 w-4" />
                  Metadata
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          {/* Taxon Tab */}
          <TabsContent value="taxon" className="mt-0 px-6 py-6">
            <TaxonTab
              selectedTaxids={selectedTaxids}
              taxonSearchQuery={taxonSearchQuery}
              setTaxonSearchQuery={setTaxonSearchQuery}
              taxonSearchResults={taxonSearchResults}
              taxonSearchLoading={taxonSearchLoading}
              expandedTaxonNodes={expandedTaxonNodes}
              setExpandedTaxonNodes={setExpandedTaxonNodes}
              onTaxonSelect={handleTaxonSelect}
              onTaxonToggle={handleTaxonToggle}
            />
          </TabsContent>

          {/* Assembly Tab */}
          <TabsContent value="assembly" className="mt-0 px-6 py-6">
            <AssemblyTab
              selectedAssemblyAccessions={selectedAssemblyAccessions}
              onAssemblyAccessionsChange={setSelectedAssemblyAccessions}
              selectedAssemblyLevels={selectedAssemblyLevels}
              onAssemblyLevelsChange={setSelectedAssemblyLevels}
              selectedAssemblyStatuses={selectedAssemblyStatuses}
              onAssemblyStatusesChange={setSelectedAssemblyStatuses}
              selectedRefseqCategories={selectedRefseqCategories}
              onRefseqCategoriesChange={setSelectedRefseqCategories}
              assemblyLevelOptions={assemblyLevelOptions}
              assemblyStatusOptions={assemblyStatusOptions}
              refseqCategoryOptions={refseqCategoryOptions}
              loadingSection={loadingSection}
              assemblyAccordionValue={assemblyAccordionValue}
              onAssemblyAccordionChange={handleAssemblyAccordionChange}
              renderFilterSection={renderFilterSection}
              assemblySearchQuery={assemblySearchQuery}
              setAssemblySearchQuery={setAssemblySearchQuery}
              assemblySearchResults={assemblySearchResults}
              assemblySearchLoading={assemblySearchLoading}
              onAssemblySelect={handleAssemblySelect}
              browseAssemblies={browseAssembliesList}
              browseAssembliesLoading={browseAssembliesLoading}
              browseAssembliesTotal={browseAssembliesTotal}
              browseAssembliesPage={browseAssembliesPage}
              setBrowseAssembliesPage={(page) => {
                const newPage = typeof page === 'function' ? page(browseAssembliesPage) : page
                setBrowseAssembliesPage(newPage)
              }}
              browseAssembliesSortBy={browseAssembliesSortBy}
              setBrowseAssembliesSortBy={(sortBy) => setBrowseAssembliesSort(sortBy, browseAssembliesSortOrder)}
              browseAssembliesSortOrder={browseAssembliesSortOrder}
              setBrowseAssembliesSortOrder={(sortOrder) => setBrowseAssembliesSort(browseAssembliesSortBy, sortOrder)}
              browseAssembliesItemsPerPage={browseAssembliesItemsPerPage}
            />
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="mt-0 px-6 py-6">
            <MetadataTab
              biotypes={biotypes}
              onBiotypesChange={setBiotypes}
              featureTypes={featureTypes}
              onFeatureTypesChange={setFeatureTypes}
              pipelines={pipelines}
              onPipelinesChange={setPipelines}
              providers={providers}
              onProvidersChange={setProviders}
              source={source}
              onSourceChange={setSource}
              biotypeOptions={biotypeOptions}
              featureTypeOptions={featureTypeOptions}
              pipelineOptions={pipelineOptions}
              providerOptions={providerOptions}
              sourceOptions={sourceOptions}
              loadingSection={loadingSection}
              metadataAccordionValue={metadataAccordionValue}
              onMetadataAccordionChange={handleMetadataAccordionChange}
              renderFilterSection={renderFilterSection}
            />
          </TabsContent>
        </Tabs>
        </div>
      </div>

      {/* Info Modal */}
      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter Guidelines</DialogTitle>
          <DialogDescription>
            Learn how to use the annotation filters effectively
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="taxon" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="taxon" className="text-xs">
              <Network className="h-3 w-3 mr-1" />
              Taxon
            </TabsTrigger>
            <TabsTrigger value="assembly" className="text-xs">
              <Database className="h-3 w-3 mr-1" />
              Assembly
            </TabsTrigger>
            <TabsTrigger value="metadata" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Metadata
            </TabsTrigger>
          </TabsList>

          <TabsContent value="taxon" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm mb-2">Search Taxons</h3>
                <p className="text-sm text-muted-foreground">
                  Use the search bar to find taxons by name or taxid. Type at least 2 characters to see results. Click on a search result to add it to your filters.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-sm mb-2">Browse Taxonomic Tree</h3>
                <p className="text-sm text-muted-foreground">
                  Explore the taxonomic hierarchy starting from Eukaryota. Click the expand icon (▶) to expand or collapse nodes. Click on a node name to select it as a filter. Selected taxons are highlighted in the tree.
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Note:</strong> When taxons are selected, the assembly list in the Assembly tab will also be filtered to show only assemblies from those taxons.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assembly" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm mb-2">Assembly Filters</h3>
                <p className="text-sm text-muted-foreground">
                  Filter assemblies by level (e.g., Chromosome, Scaffold), status (e.g., current, suppressed), and RefSeq category (e.g., reference genome). These filters apply to both the assembly list below and the annotations list. Open a section to see available options and their counts.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Browse Assemblies</h3>
                <p className="text-sm text-muted-foreground">
                  Search for assemblies by name or accession, or browse the paginated list. Use the sort buttons to sort by release date or annotation count. Click on an assembly card to select it. Selected assemblies are highlighted. The list respects your taxon selections and assembly metadata filters.
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  <strong>Important:</strong> Selecting specific assemblies will filter annotations to show only those from the selected assemblies. This may be incompatible with taxon selection - when assemblies are selected, annotations are filtered by assembly first, which may not match your taxon filters.
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Note:</strong> The assembly list is automatically filtered by your selected taxons. If you have taxons selected, only assemblies from those taxons will be shown in the browse list.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-sm mb-2">Annotation Metadata Filters</h3>
                <p className="text-sm text-muted-foreground">
                  Filter annotations by their metadata properties. Each section can be opened to see available options. Options are lazy-loaded when you open a section, showing counts based on your current filter selections.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Filter Sections</h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-2">
                  <li><strong>Biotypes:</strong> Filter by biological types (e.g., protein_coding, lncRNA)</li>
                  <li><strong>Feature Types:</strong> Filter by genomic feature types (e.g., gene, transcript, exon)</li>
                  <li><strong>Pipelines:</strong> Filter by annotation pipelines used</li>
                  <li><strong>Providers:</strong> Filter by data providers</li>
                  <li><strong>Database Sources:</strong> Filter by source databases (e.g., RefSeq, Ensembl)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Using Filters</h3>
                <p className="text-sm text-muted-foreground">
                  Only one section can be open at a time. Click on a section header to open it and see available options. Check the boxes to select filter values. If a section has more than 20 options, a search bar will appear to help you find specific values. Counts update automatically based on your other filter selections.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">Search Functionality</h3>
                <p className="text-sm text-muted-foreground">
                  When a section has more than 20 options, a search bar appears at the top. Type to filter options in real-time. The search is case-insensitive and matches any part of the option name.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="rounded-lg bg-muted/50 border p-4 mt-4">
          <h3 className="font-semibold text-sm mb-2">Filter Compatibility</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Taxon filters apply to both assemblies and annotations</li>
            <li>Assembly metadata filters (levels, statuses, RefSeq categories) apply to both the assembly list and annotations</li>
            <li>Selecting specific assemblies filters annotations by those assemblies first</li>
            <li>When both taxons and assemblies are selected, annotations are filtered by the selected assemblies (which may be a subset of the selected taxons)</li>
            <li>Metadata filters (biotypes, feature types, etc.) work together with taxon and assembly filters</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

