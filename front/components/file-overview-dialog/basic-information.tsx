"use client"

import { Card } from "@/components/ui/card"
import { Database } from "lucide-react"
import type { Annotation } from "@/lib/types"

interface BasicInformationProps {
  annotation: Annotation
}

export function BasicInformation({ annotation }: BasicInformationProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-5 w-5 text-primary" />
        <h4 className="text-sm font-semibold">Basic Information</h4>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Annotation ID</span>
          <span className="font-mono text-xs">{annotation.annotation_id}</span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Organism</span>
          <span className="text-xs">{annotation.organism_name}</span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Assembly Name</span>
          <span className="text-xs">{annotation.assembly_name}</span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span className="text-muted-foreground">Assembly Accession</span>
          <span className="font-mono text-xs">{annotation.assembly_accession}</span>
        </div>
      </div>
    </Card>
  )
}

