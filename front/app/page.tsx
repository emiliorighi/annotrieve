"use client"

import { useState } from "react"
import { SearchBar } from "@/components/search-bar"
import { FilterDetails } from "@/components/filter-details"
import { AnnotationsList } from "@/components/annotations-list"
import type { FilterType } from "@/lib/types"

export default function Home() {
  const [filterType, setFilterType] = useState<FilterType>(null)
  const [filterObject, setFilterObject] = useState<any | null>(null)

  const handleFilterSelect = (type: FilterType, object: any) => {
    setFilterType(type)
    setFilterObject(object)
  }

  const handleClearFilter = () => {
    setFilterType(null)
    setFilterObject(null)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Eukaryotic Genome Annotations</h1>
              <p className="text-sm text-muted-foreground mt-1">Explore annotated genomes from NCBI and Ensembl</p>
            </div>
          </div>
          <SearchBar onFilterSelect={handleFilterSelect} />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        {filterType && filterObject ? (
          <div className="space-y-6">
            <FilterDetails filterType={filterType} filterObject={filterObject} onClearFilter={handleClearFilter} />
            <AnnotationsList filterType={filterType} filterObject={filterObject} />
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Start Exploring</h2>
              <p className="text-muted-foreground">
                Search for an organism, assembly, or taxon to view available genome annotations
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
