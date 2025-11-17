"use client"

import { useCallback, useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Database, Network } from "lucide-react"
import { useAnnotationsFiltersStore } from "@/lib/stores/annotations-filters"
import { FilterChip } from "./active-filters/filter-chip"
import { Button } from "@/components/ui/button"
import { buildEntityDetailsUrl } from "@/lib/utils"

export function ActiveFilters() {
  const router = useRouter()
  const store = useAnnotationsFiltersStore()
  const {
    selectedTaxons,
    selectedAssemblies,
    selectedAssemblyLevels,
    selectedAssemblyStatuses,
    onlyRefGenomes,
    biotypes,
    featureTypes,
    pipelines,
    providers,
    featureSources,
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
    setFeatureSources,
    clearAllFilters,
  } = store

  // Remove handlers for each filter type
  const handleRemoveTaxid = useCallback((taxid: string) => {
    setSelectedTaxons(selectedTaxons.filter(t => String(t.taxid) !== taxid))
  }, [selectedTaxons, setSelectedTaxons])

  const handleRemoveAssembly = useCallback((accession: string) => {
    setSelectedAssemblies(selectedAssemblies.filter(a => a.assembly_accession !== accession))
  }, [selectedAssemblies, setSelectedAssemblies])

  const handleRemoveAssemblyLevel = useCallback((level: string) => {
    setSelectedAssemblyLevels(selectedAssemblyLevels.filter(l => l !== level))
  }, [selectedAssemblyLevels, setSelectedAssemblyLevels])

  const handleRemoveAssemblyStatus = useCallback((status: string) => {
    setSelectedAssemblyStatuses(selectedAssemblyStatuses.filter(s => s !== status))
  }, [selectedAssemblyStatuses, setSelectedAssemblyStatuses])

  const handleRemoveRefseqCategory = useCallback(() => {
    setOnlyRefGenomes(false)
  }, [setOnlyRefGenomes])

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

  const handleRemoveDatabaseSource = useCallback((databaseSource: string) => {
    setDatabaseSources(databaseSources.filter(d => d !== databaseSource))
  }, [databaseSources, setDatabaseSources])

  const handleRemoveFeatureSource = useCallback((featureSource: string) => {
    setFeatureSources(featureSources.filter(f => f !== featureSource))
  }, [featureSources, setFeatureSources])

  const totalFilterCount =
    selectedTaxons.length +
    selectedAssemblies.length +
    selectedAssemblyLevels.length +
    selectedAssemblyStatuses.length +
    (onlyRefGenomes ? 1 : 0) +
    biotypes.length +
    featureTypes.length +
    pipelines.length +
    providers.length +
    featureSources.length +
    databaseSources.length

  const chipColorScheme = {
    bg: "bg-card/70",
    bgHover: "hover:bg-card",
    border: "border-border/70",
    text: "text-foreground"
  }

  const filterChips = useMemo(() => {
    const chips: Array<{
      key: string
      label: string
      value: string
      onRemove: () => void
      icon?: ReactNode
      colorScheme: {
        bg: string
        bgHover: string
        border: string
        text: string
      }
      onClick?: () => void
      isActive?: boolean
    }> = []

    selectedTaxons.forEach((taxon) => {
      const taxid = String(taxon.taxid ?? "")
      chips.push({
        key: `taxon-${taxid}`,
        label: taxon.scientific_name || taxid,
        value: taxid,
        onRemove: () => handleRemoveTaxid(taxid),
        icon: <Network className="h-3.5 w-3.5" />,
        colorScheme: chipColorScheme,
        onClick: () => router.push(buildEntityDetailsUrl("taxon", taxid)),
      })
    })

    selectedAssemblies.forEach((assembly) => {
      const accession = assembly.assembly_accession || ""
      chips.push({
        key: `assembly-${accession}`,
        label: assembly.assembly_name || accession,
        value: accession,
        onRemove: () => handleRemoveAssembly(accession),
        icon: <Database className="h-3.5 w-3.5" />,
        colorScheme: chipColorScheme,
        onClick: () => router.push(buildEntityDetailsUrl("assembly", accession)),
      })
    })

    selectedAssemblyLevels.forEach((level) => {
      chips.push({
        key: `assembly-level-${level}`,
        label: level,
        value: level,
        onRemove: () => handleRemoveAssemblyLevel(level),
        colorScheme: chipColorScheme,
      })
    })

    selectedAssemblyStatuses.forEach((status) => {
      chips.push({
        key: `assembly-status-${status}`,
        label: status,
        value: status,
        onRemove: () => handleRemoveAssemblyStatus(status),
        colorScheme: chipColorScheme,
      })
    })

    if (onlyRefGenomes) {
      chips.push({
        key: "refseq-reference",
        label: "Reference genome",
        value: "reference_genome",
        onRemove: handleRemoveRefseqCategory,
        colorScheme: chipColorScheme,
      })
    }

    biotypes.forEach((biotype) => {
      chips.push({
        key: `biotype-${biotype}`,
        label: biotype,
        value: biotype,
        onRemove: () => handleRemoveBiotype(biotype),
        colorScheme: chipColorScheme,
      })
    })

    featureTypes.forEach((featureType) => {
      chips.push({
        key: `feature-type-${featureType}`,
        label: featureType,
        value: featureType,
        onRemove: () => handleRemoveFeatureType(featureType),
        colorScheme: chipColorScheme,
      })
    })

    pipelines.forEach((pipeline) => {
      chips.push({
        key: `pipeline-${pipeline}`,
        label: pipeline,
        value: pipeline,
        onRemove: () => handleRemovePipeline(pipeline),
        colorScheme: chipColorScheme,
      })
    })

    providers.forEach((provider) => {
      chips.push({
        key: `provider-${provider}`,
        label: provider,
        value: provider,
        onRemove: () => handleRemoveProvider(provider),
        colorScheme: chipColorScheme,
      })
    })

    databaseSources.forEach((databaseSource) => {
      chips.push({
        key: `database-${databaseSource}`,
        label: databaseSource,
        value: databaseSource,
        onRemove: () => handleRemoveDatabaseSource(databaseSource),
        colorScheme: chipColorScheme,
      })
    })

    featureSources.forEach((featureSource) => {
      chips.push({
        key: `feature-source-${featureSource}`,
        label: featureSource,
        value: featureSource,
        onRemove: () => handleRemoveFeatureSource(featureSource),
        colorScheme: chipColorScheme,
      })
    })

    return chips
  }, [
    selectedTaxons,
    selectedAssemblies,
    selectedAssemblyLevels,
    selectedAssemblyStatuses,
    onlyRefGenomes,
    biotypes,
    featureTypes,
    pipelines,
    providers,
    databaseSources,
    featureSources,
    handleRemoveTaxid,
    handleRemoveAssembly,
    handleRemoveAssemblyLevel,
    handleRemoveAssemblyStatus,
    handleRemoveRefseqCategory,
    handleRemoveBiotype,
    handleRemoveFeatureType,
    handleRemovePipeline,
    handleRemoveProvider,
    handleRemoveDatabaseSource,
    handleRemoveFeatureSource,
  ])

  const hasActiveFilters = store.hasActiveFilters()

  if (!hasActiveFilters) {
    return null
  }

  return (
    <div className="flex items-center gap-3 w-full overflow-x-auto">
      <div className="flex items-center gap-2 overflow-x-auto flex-1">
        {filterChips.map((chip) => (
          <FilterChip
            key={chip.key}
            label={chip.label}
            value={chip.value}
            onRemove={chip.onRemove}
            icon={chip.icon}
            isActive={chip.isActive}
            onClick={chip.onClick}
            colorScheme={chip.colorScheme}
          />
        ))}
      </div>
      <Button variant="secondary" size="sm" className="h-7 px-2 text-xs flex-shrink-0" onClick={clearAllFilters}>
        Clear all
      </Button>
    </div>
  )
}

