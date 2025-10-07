"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { TaxonDetailView } from "@/components/taxon-detail-view"
import { OrganismDetailView } from "@/components/organism-detail-view"
import { AssemblyDetailView } from "@/components/assembly-detail-view"
import type { FilterType } from "@/lib/types"

interface FilterDetailsProps {
  filterType: FilterType
  filterObject: any
  onClearFilter: () => void
}

export function FilterDetails({ filterType, filterObject, onClearFilter }: FilterDetailsProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="capitalize">
            {filterType}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClearFilter}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {filterType === "taxon" && <TaxonDetailView taxonDetails={filterObject} />}
      {filterType === "organism" && <OrganismDetailView organismDetails={filterObject} />}
      {filterType === "assembly" && <AssemblyDetailView assemblyDetails={filterObject} />}
    </Card>
  )
}
