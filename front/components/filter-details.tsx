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
  onAssembliesSelectionChange?: (accessions: string[]) => void
  onTaxonChange?: (taxid: string) => void
}

export function FilterDetails({ filterType, filterObject, onClearFilter, onAssembliesSelectionChange, onTaxonChange }: FilterDetailsProps) {
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

      {filterType === "taxon" && <TaxonDetailView taxonDetails={filterObject} onAssembliesSelectionChange={onAssembliesSelectionChange} onTaxonChange={onTaxonChange} />}
      {filterType === "organism" && <OrganismDetailView organismDetails={filterObject} onAssembliesSelectionChange={onAssembliesSelectionChange} />}
      {filterType === "assembly" && <AssemblyDetailView assemblyDetails={filterObject} />}
    </Card>
  )
}
