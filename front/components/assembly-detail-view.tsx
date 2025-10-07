"use client"

import { Badge } from "@/components/ui/badge"
import { Calendar, Building2, Database } from "lucide-react"
import { mockAssemblies } from "@/lib/mock-data"
import { AssemblyRecord } from "@/lib/api/types"

interface AssemblyDetailViewProps {
  assemblyDetails: AssemblyRecord
}

export function AssemblyDetailView({ assemblyDetails }: AssemblyDetailViewProps) {

  if (!assemblyDetails) {
    return <div className="text-muted-foreground">Assembly not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Main info */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{assemblyDetails.assembly_name}</h1>
            <p className="text-lg text-muted-foreground">{assemblyDetails.organism_name}</p>
            <Badge variant="outline" className="text-sm">
              {assemblyDetails.assembly_accession}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Total Annotations</div>
          <div className="text-2xl font-bold text-primary">{assemblyDetails.annotations_count}</div>
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-4">
        <div className="flex items-start gap-3 p-4 border rounded-lg">
          <Database className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium mb-1">Accession</div>
            <div className="font-mono text-sm text-muted-foreground">{assemblyDetails.assembly_accession}</div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 border rounded-lg">
          <Calendar className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium mb-1">Release Date</div>
            <div className="text-sm text-muted-foreground">
              {new Date(assemblyDetails.release_date as string).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 border rounded-lg">
          <Building2 className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium mb-1">Submitter</div>
            <div className="text-sm text-muted-foreground">{assemblyDetails.submitter as string}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
