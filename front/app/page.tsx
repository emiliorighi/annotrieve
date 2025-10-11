"use client"

import { useState } from "react"
import { SearchBar } from "@/components/search-bar"
import { FilterDetails } from "@/components/filter-details"
import { AnnotationsList } from "@/components/annotations-list"
import { Hero } from "@/components/hero"
import type { FilterType } from "@/lib/types"
import { getTaxon } from "@/lib/api/taxons"
import { DataPipelineTimeline } from "@/components/pipeline-steps"
import { getAssembly } from "@/lib/api/assemblies"
import { TopAnnotations } from "@/components/top-annotated-records"

export default function Home() {
  const [filterType, setFilterType] = useState<FilterType>(null)
  const [filterObject, setFilterObject] = useState<any | null>(null)
  const [selectedAssemblyAccessions, setSelectedAssemblyAccessions] = useState<string[]>([])

  const handleFilterSelect = (type: FilterType, object: any) => {
    setFilterType(type)
    setFilterObject(object)
  }

  const handleClearFilter = () => {
    setFilterType(null)
    setFilterObject(null)
    setSelectedAssemblyAccessions([])
  }

  const handleAssembliesSelectionChange = (accessions: string[]) => {
    setSelectedAssemblyAccessions(accessions)
  }

  const handleTaxonChange = async (taxid: string) => {
    try {
      const taxon = await getTaxon(taxid)
      setFilterType("taxon")
      setFilterObject(taxon)
      setSelectedAssemblyAccessions([]) // Reset selected assemblies
    } catch (error) {
      console.error("Failed to fetch taxon:", error)
    }
  }

  const handleJBrowseChange = (accession: string, annotationId?: string) => {
    const params = new URLSearchParams({ accession })
    if (annotationId) {
      params.set('annotationId', annotationId)
    }
    window.location.href = `/jbrowse?${params.toString()}`
  }

  const handleAssemblySelect = async (accession: string) => {
    try {
      const assembly = await getAssembly(accession)
      setFilterType("assembly")
      setFilterObject(assembly)
      setSelectedAssemblyAccessions([]) // Reset selected assemblies when viewing assembly details
    } catch (error) {
      console.error("Failed to fetch assembly:", error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 z-index-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Annotrieve</h1>
            </div>
          </div>
          <SearchBar onFilterSelect={handleFilterSelect} />
        </div>
      </header>

      <main className="flex-1">
        {filterType && filterObject ? (
          <div className="container mx-auto px-4 py-6 space-y-6">
            <FilterDetails
              filterType={filterType}
              filterObject={filterObject}
              onClearFilter={handleClearFilter}
              onAssembliesSelectionChange={handleAssembliesSelectionChange}
              onTaxonChange={handleTaxonChange}
              onJBrowseChange={handleJBrowseChange}
              onAssemblySelect={handleAssemblySelect}
            />
            <AnnotationsList
              filterType={filterType}
              filterObject={filterObject}
              selectedAssemblyAccessions={selectedAssemblyAccessions}
              onJBrowseChange={handleJBrowseChange}
            />

          </div>
        ) : (
          <>
            <Hero />
            <TopAnnotations onFilterSelect={handleFilterSelect} />
          </>
        )}
      </main>
    </div>
  )
}
