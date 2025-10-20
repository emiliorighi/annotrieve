"use client"

import { useState } from "react"
import Link from "next/link"
import { Github } from "lucide-react"
import { SearchBar } from "@/components/search-bar"
import { FilterDetails } from "@/components/filter-details"
import { AnnotationsList } from "@/components/annotations-list"
import { Hero } from "@/components/hero"
import type { FilterType } from "@/lib/types"
import { getTaxon } from "@/lib/api/taxons"
import { DataPipelineTimeline } from "@/components/pipeline-steps"
import { StatsComputationGuide } from "@/components/stats-computation-guide"
import { AnnotationsCharts } from "@/components/annotations-charts"
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
        <div className="flex items-center py-4">
          {/* Left side - Title */}
          <div className="px-6">
            <h1 className="text-2xl font-bold text-foreground whitespace-nowrap">Annotrieve</h1>
          </div>


          {/* Center - Search bar (container aligned) */}
          <div className="flex-1 container mx-auto px-4">
            <SearchBar onFilterSelect={handleFilterSelect} />
          </div>

          {/* Right side - Navigation links */}
          <nav className="flex items-center gap-6 px-6">
            <Link href="/faqs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              FAQs
            </Link>
            <Link href="/api-docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              API
            </Link>
            <a 
              href="https://github.com/emiliorighi/annotrieve" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
          </nav>
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
            {/* <AnnotationsCharts /> */}
          </>
        )}
      </main>
    </div>
  )
}
