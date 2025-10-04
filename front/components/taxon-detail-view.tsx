"use client"

import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import { findTaxonById, getTaxonPath } from "@/lib/mock-data"
import { TaxonRecord } from "@/lib/api/types"
import { listTaxons } from "@/lib/api/taxons"
import { useEffect } from "react"
import { useState } from "react"

interface TaxonDetailViewProps {
  taxonDetails: TaxonRecord
}

export function TaxonDetailView({ taxonDetails }: TaxonDetailViewProps) {
  const taxon = findTaxonById(taxonDetails.taxid)
  const path = getTaxonPath(taxonDetails.taxid)
  const [children, setChildren] = useState<TaxonRecord[]>([])
  if (!taxon) {
    return <div className="text-muted-foreground">Taxon not found</div>
  }

  //use useEffect to fetch the children
  useEffect(() => {
    const fetchChildren = async () => {
      const children = await listTaxons({ taxid: taxonDetails.taxid })
      setChildren(children.results)
    }
    fetchChildren()
  }, [taxonDetails.taxid])
  return (
    <div className="space-y-6">
      {/* Breadcrumb path */}
      <div className="flex items-center gap-2 flex-wrap">
        {path.map((node, index) => (
          <div key={node.id} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <Badge variant={node.id === taxonDetails.taxid ? "default" : "secondary"} className="text-xs">
              {node.name}
            </Badge>
          </div>
        ))}
      </div>

      {/* Main info */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-3xl font-bold mb-2">{taxonDetails.scientific_name}</h3>
            <p className="text-lg text-muted-foreground italic">{taxonDetails.taxid}</p>
          </div>
          <Badge variant="outline" className="text-sm capitalize">
            {taxon.rank}
          </Badge>
        </div>
        <p className="text-foreground leading-relaxed">{taxon.description}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
      <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Total Organisms</div>
          <div className="text-2xl font-bold text-primary">{taxonDetails.organisms_count}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Total Annotations</div>
          <div className="text-2xl font-bold text-primary">{taxonDetails.annotations_count}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Total Assemblies</div>
          <div className="text-2xl font-bold text-primary">{taxonDetails.assemblies_count}</div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Taxonomic Rank</div>
          <div className="text-2xl font-bold capitalize">{taxonDetails.rank}</div>
        </div>
      </div>

      {/* Children taxons */}
      {taxonDetails.children && taxonDetails.children.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-3">Child Taxa</h4>
          <div className="grid gap-3">
            {children.map((child) => (
              <div key={child.taxid} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-semibold">{child.scientific_name || child.taxid}</h5>
                      <Badge variant="outline" className="text-xs capitalize">
                        {child.rank}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground italic mb-2">{child.scientific_name}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm text-muted-foreground">Organisms</div>
                    <div className="text-lg font-bold text-primary">{child.organisms_count}</div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm text-muted-foreground">Assemblies</div>
                    <div className="text-lg font-bold text-primary">{child.assemblies_count}</div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm text-muted-foreground">Annotations</div>
                    <div className="text-lg font-bold text-primary">{child.annotations_count}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
