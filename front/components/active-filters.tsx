"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Database, Network, Filter as FilterIcon } from "lucide-react"
import { getTaxon } from "@/lib/api/taxons"
import { getAssembly } from "@/lib/api/assemblies"
import type { TaxonRecord, AssemblyRecord } from "@/lib/api/types"
import { EntityCard } from "./active-filters/entity-card"
import { FilterChip } from "./active-filters/filter-chip"
import { TaxonDetailPopover } from "./active-filters/taxon-detail-popover"
import { AssemblyDetailPopover } from "./active-filters/assembly-detail-popover"
import { useAnnotationsFiltersStore } from "@/lib/stores/annotations-filters"

export function ActiveFilters() {
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
  } = store
  const [selectedTaxons, setSelectedTaxons] = useState<TaxonRecord[]>([])
  const [selectedAssemblies, setSelectedAssemblies] = useState<AssemblyRecord[]>([])
  const [loadingTaxons, setLoadingTaxons] = useState(false)
  const [loadingAssemblies, setLoadingAssemblies] = useState(false)
  
  // Detail view popovers
  const [openTaxonPopover, setOpenTaxonPopover] = useState<string | null>(null)
  const [openAssemblyPopover, setOpenAssemblyPopover] = useState<string | null>(null)
  const [taxonDetails, setTaxonDetails] = useState<Record<string, TaxonRecord>>({})
  const [assemblyDetails, setAssemblyDetails] = useState<Record<string, AssemblyRecord>>({})
  const [loadingTaxonDetails, setLoadingTaxonDetails] = useState<Set<string>>(new Set())
  const [loadingAssemblyDetails, setLoadingAssemblyDetails] = useState<Set<string>>(new Set())
  
  // Hover timeout for smooth transitions
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Refs to track what's loaded/loading (avoid dependency on state objects)
  const loadedTaxonsRef = useRef<Record<string, boolean>>({})
  const loadedAssembliesRef = useRef<Record<string, boolean>>({})
  const loadingTaxonsRef = useRef<Set<string>>(new Set())
  const loadingAssembliesRef = useRef<Set<string>>(new Set())
  
  // Load taxon details when popover opens
  useEffect(() => {
    if (!openTaxonPopover) {
      return
    }
    
    // Check refs to see if already loaded or loading
    if (loadedTaxonsRef.current[openTaxonPopover] || loadingTaxonsRef.current.has(openTaxonPopover)) {
      return
    }
    
    // Mark as loading
    loadingTaxonsRef.current.add(openTaxonPopover)
    setLoadingTaxonDetails(new Set(loadingTaxonsRef.current))
    
    // Fetch data
    getTaxon(openTaxonPopover)
      .then(details => {
        loadedTaxonsRef.current[openTaxonPopover] = true
        setTaxonDetails(prev => ({ ...prev, [openTaxonPopover]: details }))
      })
      .catch(error => {
        console.error("Error loading taxon details:", error)
      })
      .finally(() => {
        loadingTaxonsRef.current.delete(openTaxonPopover)
        setLoadingTaxonDetails(new Set(loadingTaxonsRef.current))
      })
  }, [openTaxonPopover])
  
  // Load assembly details when popover opens
  useEffect(() => {
    if (!openAssemblyPopover) {
      return
    }
    
    // Check refs to see if already loaded or loading
    if (loadedAssembliesRef.current[openAssemblyPopover] || loadingAssembliesRef.current.has(openAssemblyPopover)) {
      return
    }
    
    // Mark as loading
    loadingAssembliesRef.current.add(openAssemblyPopover)
    setLoadingAssemblyDetails(new Set(loadingAssembliesRef.current))
    
    // Fetch data
    getAssembly(openAssemblyPopover)
      .then(details => {
        loadedAssembliesRef.current[openAssemblyPopover] = true
        setAssemblyDetails(prev => ({ ...prev, [openAssemblyPopover]: details }))
      })
      .catch(error => {
        console.error("Error loading assembly details:", error)
      })
      .finally(() => {
        loadingAssembliesRef.current.delete(openAssemblyPopover)
        setLoadingAssemblyDetails(new Set(loadingAssembliesRef.current))
      })
  }, [openAssemblyPopover])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Load selected taxons
  useEffect(() => {
    async function loadTaxons() {
      if (selectedTaxids.length === 0) {
        setSelectedTaxons([])
        return
      }

      setLoadingTaxons(true)
      try {
        const taxons = await Promise.all(
          selectedTaxids.map(taxid =>
            getTaxon(taxid).catch(() => null)
          )
        )
        setSelectedTaxons(taxons.filter((t): t is TaxonRecord => t !== null))
      } catch (error) {
        console.error("Error loading selected taxons:", error)
      } finally {
        setLoadingTaxons(false)
      }
    }
    loadTaxons()
  }, [selectedTaxids])

  // Load selected assemblies
  useEffect(() => {
    async function loadAssemblies() {
      if (selectedAssemblyAccessions.length === 0) {
        setSelectedAssemblies([])
        return
      }

      setLoadingAssemblies(true)
      try {
        const assemblies = await Promise.all(
          selectedAssemblyAccessions.map(accession =>
            getAssembly(accession).catch(() => null)
          )
        )
        setSelectedAssemblies(assemblies.filter((a): a is AssemblyRecord => a !== null))
      } catch (error) {
        console.error("Error loading selected assemblies:", error)
      } finally {
        setLoadingAssemblies(false)
      }
    }
    loadAssemblies()
  }, [selectedAssemblyAccessions])

  // Remove handlers for each filter type
  const handleRemoveTaxid = useCallback((taxid: string) => {
    setSelectedTaxids(selectedTaxids.filter(id => id !== taxid))
  }, [selectedTaxids, setSelectedTaxids])
  
  const handleRemoveAssembly = useCallback((accession: string) => {
    setSelectedAssemblyAccessions(selectedAssemblyAccessions.filter(acc => acc !== accession))
  }, [selectedAssemblyAccessions, setSelectedAssemblyAccessions])
  
  const handleRemoveAssemblyLevel = useCallback((level: string) => {
    setSelectedAssemblyLevels(selectedAssemblyLevels.filter(l => l !== level))
  }, [selectedAssemblyLevels, setSelectedAssemblyLevels])
  
  const handleRemoveAssemblyStatus = useCallback((status: string) => {
    setSelectedAssemblyStatuses(selectedAssemblyStatuses.filter(s => s !== status))
  }, [selectedAssemblyStatuses, setSelectedAssemblyStatuses])
  
  const handleRemoveRefseqCategory = useCallback((category: string) => {
    setSelectedRefseqCategories(selectedRefseqCategories.filter(c => c !== category))
  }, [selectedRefseqCategories, setSelectedRefseqCategories])
  
  const handleRemoveBiotype = useCallback((biotype: string) => {
    setBiotypes(biotypes.filter(b => b !== biotype))
  }, [biotypes, setBiotypes])
  
  const handleRemoveFeatureType = useCallback((type: string) => {
    setFeatureTypes(featureTypes.filter(t => t !== type))
  }, [featureTypes, setFeatureTypes])
  
  const handleRemovePipeline = useCallback((pipeline: string) => {
    setPipelines(pipelines.filter(p => p !== pipeline))
  }, [pipelines, setPipelines])
  
  const handleRemoveProvider = useCallback((provider: string) => {
    setProviders(providers.filter(pr => pr !== provider))
  }, [providers, setProviders])
  
  const handleRemoveSource = useCallback(() => {
    setSource('all')
  }, [setSource])
  
  const handleRemoveMostRecentPerSpecies = useCallback(() => {
    setMostRecentPerSpecies(false)
  }, [setMostRecentPerSpecies])

  // Generic card click handler
  const handleCardClick = useCallback((
    id: string,
    e: React.MouseEvent,
    openId: string | null,
    setOpenId: (id: string | null) => void
  ) => {
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    setOpenId(openId === id ? null : id)
  }, [])

  // Generic mouse enter handler for hover
  const handleMouseEnter = useCallback((id: string, setOpenId: (id: string | null) => void) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      hoverTimeoutRef.current = setTimeout(() => {
        setOpenId(id)
      }, 300)
    }
  }, [])

  // Generic mouse leave handler
  const handleMouseLeave = useCallback((
    e: React.MouseEvent,
    setOpenId: (id: string | null) => void
  ) => {
    const relatedTarget = e.relatedTarget as HTMLElement
    if (relatedTarget?.closest('[role="dialog"]')) {
      return
    }
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenId(null)
    }, 150)
  }, [])

  // Generic popover mouse enter handler
  const handlePopoverMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  // Generic popover mouse leave handler
  const handlePopoverMouseLeave = useCallback((setOpenId: (id: string | null) => void) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenId(null)
    }, 150)
  }, [])

  const hasActiveFilters = store.hasActiveFilters()

  if (!hasActiveFilters) {
    return null
  }

  // Color schemes
  const taxonColorScheme = {
    bg: "bg-green-50 dark:bg-green-950/30",
    bgHover: "hover:bg-green-100 dark:hover:bg-green-950/50",
    bgOpen: "bg-green-100 dark:bg-green-950/50",
    border: "border-green-200 dark:border-green-800",
    text: "text-green-900 dark:text-green-100",
    textSecondary: "text-green-700 dark:text-green-300",
    icon: "text-green-600 dark:text-green-400",
    buttonHover: "hover:bg-green-200 dark:hover:bg-green-800"
  }

  const assemblyColorScheme = {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    bgHover: "hover:bg-blue-100 dark:hover:bg-blue-950/50",
    bgOpen: "bg-blue-100 dark:bg-blue-950/50",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-900 dark:text-blue-100",
    textSecondary: "text-blue-700 dark:text-blue-300",
    icon: "text-blue-600 dark:text-blue-400",
    buttonHover: "hover:bg-blue-200 dark:hover:bg-blue-800"
  }

  const purpleColorScheme = {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    bgHover: "hover:bg-purple-100 dark:hover:bg-purple-950/50",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-900 dark:text-purple-100"
  }

  const amberColorScheme = {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    bgHover: "hover:bg-amber-100 dark:hover:bg-amber-950/50",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-900 dark:text-amber-100"
  }

  const slateColorScheme = {
    bg: "bg-slate-50 dark:bg-slate-900/50",
    bgHover: "hover:bg-slate-100 dark:hover:bg-slate-800/50",
    border: "border-slate-200 dark:border-slate-700",
    text: "text-slate-900 dark:text-slate-100"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Active Filters</h3>
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Selected Taxons */}
        {selectedTaxons.map((taxon) => {
          const taxid = taxon.taxid || ""
          const isOpen = openTaxonPopover === taxid
          const details = taxonDetails[taxid]
          const isLoading = loadingTaxonDetails.has(taxid)
          
          return (
            <EntityCard
              key={taxid}
              id={taxid}
              title={taxon.scientific_name || "Unknown"}
              subtitle={taxid}
              icon={<Network className="h-3.5 w-3.5" />}
              isOpen={isOpen}
              onOpenChange={(open) => setOpenTaxonPopover(open ? taxid : null)}
              onCardClick={(e) => handleCardClick(taxid, e, openTaxonPopover, setOpenTaxonPopover)}
              onMouseEnter={() => handleMouseEnter(taxid, setOpenTaxonPopover)}
              onMouseLeave={(e) => handleMouseLeave(e, setOpenTaxonPopover)}
              onRemove={() => handleRemoveTaxid(taxid)}
              colorScheme={taxonColorScheme}
              popoverContent={<TaxonDetailPopover details={details} isLoading={isLoading} />}
              onPopoverMouseEnter={handlePopoverMouseEnter}
              onPopoverMouseLeave={() => handlePopoverMouseLeave(setOpenTaxonPopover)}
            />
          )
        })}

        {/* Selected Assemblies */}
        {selectedAssemblies.map((assembly) => {
          const isOpen = openAssemblyPopover === assembly.assembly_accession
          const details = assemblyDetails[assembly.assembly_accession]
          const isLoading = loadingAssemblyDetails.has(assembly.assembly_accession)
          
          return (
            <EntityCard
              key={assembly.assembly_accession}
              id={`assembly-${assembly.assembly_accession}`}
              title={assembly.assembly_name}
              subtitle={assembly.assembly_accession}
              icon={<Database className="h-3.5 w-3.5" />}
              isOpen={isOpen}
              onOpenChange={(open) => setOpenAssemblyPopover(open ? assembly.assembly_accession : null)}
              onCardClick={(e) => handleCardClick(assembly.assembly_accession, e, openAssemblyPopover, setOpenAssemblyPopover)}
              onMouseEnter={() => handleMouseEnter(assembly.assembly_accession, setOpenAssemblyPopover)}
              onMouseLeave={(e) => handleMouseLeave(e, setOpenAssemblyPopover)}
              onRemove={() => handleRemoveAssembly(assembly.assembly_accession)}
              colorScheme={assemblyColorScheme}
              popoverContent={<AssemblyDetailPopover details={details} isLoading={isLoading} />}
              onPopoverMouseEnter={handlePopoverMouseEnter}
              onPopoverMouseLeave={() => handlePopoverMouseLeave(setOpenAssemblyPopover)}
              subtitleClassName="font-mono"
            />
          )
        })}

        {/* Assembly Levels */}
        {selectedAssemblyLevels.map((level) => (
          <FilterChip
            key={level}
            label={`Level: ${level}`}
            value={level}
            onRemove={() => handleRemoveAssemblyLevel(level)}
            colorScheme={purpleColorScheme}
          />
        ))}

        {/* Assembly Statuses */}
        {selectedAssemblyStatuses.map((status) => (
          <FilterChip
            key={status}
            label={`Status: ${status}`}
            value={status}
            onRemove={() => handleRemoveAssemblyStatus(status)}
            colorScheme={purpleColorScheme}
          />
        ))}

        {/* RefSeq Categories */}
        {selectedRefseqCategories.map((category) => (
          <FilterChip
            key={category}
            label={`RefSeq: ${category}`}
            value={category}
            onRemove={() => handleRemoveRefseqCategory(category)}
            colorScheme={purpleColorScheme}
          />
        ))}

        {/* Biotypes */}
        {biotypes.map((biotype) => (
          <FilterChip
            key={biotype}
            label={`Biotype: ${biotype}`}
            value={biotype}
            onRemove={() => handleRemoveBiotype(biotype)}
            colorScheme={amberColorScheme}
          />
        ))}

        {/* Feature Types */}
        {featureTypes.map((featureType) => (
          <FilterChip
            key={featureType}
            label={`Feature: ${featureType}`}
            value={featureType}
            onRemove={() => handleRemoveFeatureType(featureType)}
            colorScheme={amberColorScheme}
          />
        ))}

        {/* Pipelines */}
        {pipelines.map((pipeline) => (
          <FilterChip
            key={pipeline}
            label={`Pipeline: ${pipeline}`}
            value={pipeline}
            onRemove={() => handleRemovePipeline(pipeline)}
            colorScheme={slateColorScheme}
          />
        ))}

        {/* Providers */}
        {providers.map((provider) => (
          <FilterChip
            key={provider}
            label={`Provider: ${provider}`}
            value={provider}
            onRemove={() => handleRemoveProvider(provider)}
            colorScheme={slateColorScheme}
          />
        ))}

        {/* Source */}
        {source && source !== "all" && (
          <FilterChip
            label={`Source: ${source}`}
            value={source}
            onRemove={handleRemoveSource}
            colorScheme={slateColorScheme}
          />
        )}

        {/* Most Recent Per Species */}
        {mostRecentPerSpecies && (
          <FilterChip
            label="Most Recent Per Species"
            value="mostRecentPerSpecies"
            onRemove={handleRemoveMostRecentPerSpecies}
            colorScheme={slateColorScheme}
          />
        )}
      </div>
    </div>
  )
}

