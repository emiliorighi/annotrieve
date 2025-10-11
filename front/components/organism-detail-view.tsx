"use client"

import { Badge } from "@/components/ui/badge"
import { OrganismRecord } from "@/lib/api/types"
import { AssembliesList } from "./assemblies-list"
import { WikiSummary } from "./wiki-summary"
import { Database } from "lucide-react"

interface OrganismDetailViewProps {
  organismDetails: OrganismRecord
  onAssembliesSelectionChange?: (accessions: string[]) => void
  onAssemblySelect?: (accession: string) => void
  onJBrowseChange?: (accession: string, annotationId?: string) => void
}

export function OrganismDetailView({ organismDetails, onAssembliesSelectionChange, onAssemblySelect, onJBrowseChange }: OrganismDetailViewProps) {
  if (!organismDetails) {
    return <div className="text-muted-foreground">Organism not found</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold mb-2">{(organismDetails as any).common_name || (organismDetails as any).organism_name}</h2>
            <p className="text-lg text-muted-foreground italic">{(organismDetails as any).organism_name}</p>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Database className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium mb-1">NCBI TaxID</div>
                <div className="font-mono text-sm text-muted-foreground">{organismDetails.taxid}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Wikipedia Summary */}
      <WikiSummary 
        searchTerm={(organismDetails as any).organism_name || ""} 
        className="mb-6"
      />
      <AssembliesList
        taxid={organismDetails.taxid}
        onAssembliesSelectionChange={onAssembliesSelectionChange}
        onAssemblySelect={onAssemblySelect}
        onJBrowseChange={onJBrowseChange}
        view="organism"
      />
    </div>
  )
}
