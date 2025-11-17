"use client"

import { useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CommonSearchBar } from "@/components/common-search-bar"
import type { CommonSearchResult } from "@/lib/types"
import { createOrganismSearchModel, createTaxonSearchModel, createAssemblySearchModel } from "@/lib/search-models"
import { useAnnotationsFiltersStore } from "@/lib/stores/annotations-filters"
import type { AssemblyRecord, TaxonRecord } from "@/lib/api/types"

export function SearchBar() {
  const router = useRouter()
  const {
    selectedAssemblies,
    selectedTaxons,
    setSelectedTaxons,
    setSelectedAssemblies,
  } = useAnnotationsFiltersStore()

  const searchModels = useMemo(
    () => [
      createOrganismSearchModel(5),
      createTaxonSearchModel(5, { requireChildren: true }),
      createAssemblySearchModel(5),
    ],
    []
  )

  const handleSelect = useCallback(
    (result: CommonSearchResult) => {
      let targetPath = "/annotations/"

      if (result.modelKey === "assembly") {
        const assembly = result.data as AssemblyRecord
        if (assembly?.assembly_accession) {
          targetPath = `/assemblies?id=${assembly.assembly_accession}`
        }
        if (
          assembly &&
          !selectedAssemblies.find((a) => a.assembly_accession === assembly.assembly_accession)
        ) {
          setSelectedAssemblies([...selectedAssemblies, assembly])
        }
      } else {
        const taxon = result.data as TaxonRecord
        const taxid = taxon?.taxid
        if (taxid) {
          targetPath = result.modelKey === "organism" ? `/organisms?id=${taxid}` : `/taxons?id=${taxid}`
        }
        if (taxon && taxid && !selectedTaxons.find((t) => t.taxid === taxid)) {
          setSelectedTaxons([...selectedTaxons, taxon])
        }
      }

      router.push(targetPath)
    },
    [router, selectedAssemblies, selectedTaxons, setSelectedAssemblies, setSelectedTaxons]
  )

  return (
    <CommonSearchBar
      className="w-full max-w-2xl"
      inputClassName="h-11 bg-background"
      placeholder="Search by organism, taxon or assembly..."
      models={searchModels}
      onSelect={handleSelect}
    />
  )
}
