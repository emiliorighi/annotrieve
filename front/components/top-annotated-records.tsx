"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Dna, Database, Loader2 } from "lucide-react"
import { listOrganisms } from "@/lib/api/organisms"
import { listAssemblies } from "@/lib/api/assemblies"
import { listTaxons } from "@/lib/api/taxons"
import type { OrganismRecord, AssemblyRecord, TaxonRecord } from "@/lib/api/types"
import type { FilterType } from "@/lib/types"

interface TopAnnotationsProps {
  onFilterSelect: (type: FilterType, object: any) => void
}

export function TopAnnotations({ onFilterSelect }: TopAnnotationsProps) {
  const [topOrganisms, setTopOrganisms] = useState<OrganismRecord[]>([])
  const [topAssemblies, setTopAssemblies] = useState<AssemblyRecord[]>([])
  const [topTaxons, setTopTaxons] = useState<TaxonRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTopRecords() {
      try {
        setLoading(true)
        // Fetch all data in parallel
        const [organismsResponse, assembliesResponse, taxonsResponse] = await Promise.all([
          // Fetch top organisms sorted by annotations_count
          listOrganisms({ 
            sort_by: "annotations_count",
            sort_order: "desc",
            limit: 5, 
            offset: 0 
          }),
          // Fetch top assemblies sorted by annotations_count
          listAssemblies({ 
            sort_by: "annotations_count",
            sort_order: "desc",
            limit: 5, 
            offset: 0 
          }),
          // Fetch taxons to filter for classes/ranks
          listTaxons({ 
            sort_by: "annotations_count",
            sort_order: "desc",
            rank: "class",
            limit: 5, 
            offset: 0 
          })
        ])

        setTopOrganisms(organismsResponse.results??[])
        setTopAssemblies(assembliesResponse.results??[])
        setTopTaxons(taxonsResponse.results??[])

      } catch (error) {
        console.error('Error fetching top records:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTopRecords()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading most annotated records...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-3">Most Annotated Records</h2>
        <p className="text-muted-foreground text-lg">
          Explore the most annotated records available in the portal
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Species */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Dna className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold">Top Organisms</h3>
          </div>
          <div className="space-y-3">
            {topOrganisms.map((organism, index) => (
              <Card
                key={organism.taxid}
                className="p-4 hover:shadow-md transition-all cursor-pointer group hover:border-primary/50"
                onClick={() => onFilterSelect("organism", organism)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground italic truncate">{organism.organism_name}</span>
                    </div>
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                      {organism.common_name || organism.organism_name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="text-lg font-bold text-primary">{organism.annotations_count?.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">annotations</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Top Taxonomic Groups */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold">Top Taxonomic Groups (Classes)</h3>
          </div>
          <div className="space-y-3">
            {topTaxons.map((taxon, index) => (
              <Card
                key={taxon.taxid}
                className="p-4 hover:shadow-md transition-all cursor-pointer group hover:border-primary/50"
                onClick={() => onFilterSelect("taxon", taxon)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                      {taxon.scientific_name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="text-lg font-bold text-primary">{taxon.annotations_count?.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">annotations</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Top Assemblies */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-semibold">Top Genome Assemblies</h3>
          </div>
          <div className="space-y-3">
            {topAssemblies.map((assembly, index) => (
              <Card
                key={assembly.assembly_accession}
                className="p-4 hover:shadow-md transition-all cursor-pointer group hover:border-primary/50"
                onClick={() => onFilterSelect("assembly", assembly)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">{assembly.assembly_accession}</span>
                    </div>
                    <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                      {assembly.assembly_name}
                    </p>
                    <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{assembly.organism_name}</p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="text-lg font-bold text-primary">{assembly.annotations_count?.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">annotations</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
