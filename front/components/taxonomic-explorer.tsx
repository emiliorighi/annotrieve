"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { TaxonomicTreeTable } from "@/components/taxonomic-tree-table"
import { getTaxon, getTaxonChildren, getTaxonAncestors } from "@/lib/api/taxons"
import type { TaxonRecord } from "@/lib/api/types"
import { Network } from "lucide-react"

export function TaxonomicExplorer() {
  const [currentTaxon, setCurrentTaxon] = useState<TaxonRecord | null>(null)
  const [ancestors, setAncestors] = useState<TaxonRecord[]>([])
  const [children, setChildren] = useState<TaxonRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchTaxonData() {
      try {
        setIsLoading(true)
        const taxid = "2759" // Eukaryota
        
        const [taxonData, ancestorsData, childrenData] = await Promise.all([
          getTaxon(taxid),
          getTaxonAncestors(taxid),
          getTaxonChildren(taxid)
        ])

        setCurrentTaxon(taxonData)
        setAncestors(ancestorsData.results || [])
        setChildren(childrenData.results || [])
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch taxonomic data:', error)
        setIsLoading(false)
      }
    }

    fetchTaxonData()
  }, [])

  const handleTaxonClick = async (taxid: string) => {
    try {
      const [taxonData, ancestorsData, childrenData] = await Promise.all([
        getTaxon(taxid),
        getTaxonAncestors(taxid),
        getTaxonChildren(taxid)
      ])

      setCurrentTaxon(taxonData)
      setAncestors(ancestorsData.results || [])
      setChildren(childrenData.results || [])
    } catch (error) {
      console.error('Failed to fetch taxon:', error)
    }
  }

  if (isLoading) {
    return null
  }

  if (!currentTaxon) {
    return null
  }

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column - Header and Description */}
        <div className="lg:col-span-1 space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-green-500/10">
              <Network className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Taxonomic Tree
              </h2>
            </div>
          </div>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            Navigate through the tree of life, exploring the hierarchical classification of all eukaryotic organisms in our database.
          </p>

          <div className="pt-4 space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
              <p className="text-sm text-muted-foreground">
                Left click on any taxon to explore its descendants and right click to see the taxon details.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
              <p className="text-sm text-muted-foreground">
                The tree shows the the ancestors and descendants of the current taxon, and the number of annotations for each taxon.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
              <p className="text-sm text-muted-foreground">
                Currently viewing: <span className="font-semibold text-foreground italic">{currentTaxon.scientific_name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Tree Table */}
        <div className="lg:col-span-2 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '150ms' }}>
          <Card className="overflow-hidden border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="h-[500px] overflow-y-auto">
              <TaxonomicTreeTable
                ancestors={ancestors}
                currentTaxon={currentTaxon}
                children={children}
                onTaxonClick={handleTaxonClick}
              />
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}

