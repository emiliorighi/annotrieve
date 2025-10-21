"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { FilterDetails } from "@/components/filter-details"
import { AnnotationsList } from "@/components/annotations-list"
import type { FilterType } from "@/lib/types"
import { getTaxon } from "@/lib/api/taxons"
import { getAssembly } from "@/lib/api/assemblies"
import { getOrganism } from "@/lib/api/organisms"

export default function AnnotationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filterType, setFilterType] = useState<FilterType>(null)
  const [filterObject, setFilterObject] = useState<any | null>(null)
  const [selectedAssemblyAccessions, setSelectedAssemblyAccessions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadFilters() {
      try {
        setIsLoading(true)
        
        // Check URL parameters
        const assemblyParam = searchParams?.get('assembly')
        const taxonParam = searchParams?.get('taxon')
        const organismParam = searchParams?.get('organism')

        if (assemblyParam) {
          // Load assembly filter
          const assembly = await getAssembly(assemblyParam)
          setFilterType('assembly')
          setFilterObject(assembly)
        } else if (taxonParam) {
          // Load taxon filter
          const taxon = await getTaxon(taxonParam)
          setFilterType('taxon')
          setFilterObject(taxon)
        } else if (organismParam) {
          // Load organism filter (organism is essentially a taxon)
          const organism = await getOrganism(organismParam)
          setFilterType('organism')
          setFilterObject(organism)
        } else {
          // No filters - show all annotations
          setFilterType(null)
          setFilterObject(null)
        }
      } catch (error) {
        console.error('Error loading filter:', error)
        setFilterType(null)
        setFilterObject(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadFilters()
  }, [searchParams])


  const handleClearFilter = () => {
    setFilterType(null)
    setFilterObject(null)
    setSelectedAssemblyAccessions([])
    // Navigate to clean /annotations route
    router.push('/annotations/')
  }

  const handleAssembliesSelectionChange = (accessions: string[]) => {
    setSelectedAssemblyAccessions(accessions)
  }

  const handleTaxonChange = async (taxid: string) => {
    try {
      const taxon = await getTaxon(taxid)
      setFilterType("taxon")
      setFilterObject(taxon)
      setSelectedAssemblyAccessions([])
      // Update URL
      window.history.pushState({}, '', `/annotations/?taxon=${taxid}`)
    } catch (error) {
      console.error("Failed to fetch taxon:", error)
    }
  }

  const handleJBrowseChange = (accession: string, annotationId?: string) => {
    const params = new URLSearchParams({ accession })
    if (annotationId) {
      params.set('annotationId', annotationId)
    }
    window.location.href = `/jbrowse/?${params.toString()}`
  }

  const handleAssemblySelect = async (accession: string) => {
    try {
      const assembly = await getAssembly(accession)
      setFilterType("assembly")
      setFilterObject(assembly)
      setSelectedAssemblyAccessions([])
      // Update URL
      window.history.pushState({}, '', `/annotations/?assembly=${accession}`)
    } catch (error) {
      console.error("Failed to fetch assembly:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {filterType && filterObject && (
        <FilterDetails
          filterType={filterType}
          filterObject={filterObject}
          onClearFilter={handleClearFilter}
          onAssembliesSelectionChange={handleAssembliesSelectionChange}
          onTaxonChange={handleTaxonChange}
          onJBrowseChange={handleJBrowseChange}
          onAssemblySelect={handleAssemblySelect}
        />
      )}
      
      <AnnotationsList
        filterType={filterType}
        filterObject={filterObject || {}}
        selectedAssemblyAccessions={selectedAssemblyAccessions}
        onJBrowseChange={handleJBrowseChange}
      />
    </div>
  )
}

