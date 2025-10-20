"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface ActiveFiltersDisplayProps {
  source: string
  biotypes: string[]
  featureTypes: string[]
  pipelines: string[]
  providers: string[]
  mostRecentPerSpecies?: boolean
  onClearAll: () => void
}

export function ActiveFiltersDisplay({
  source,
  biotypes,
  featureTypes,
  pipelines,
  providers,
  mostRecentPerSpecies = false,
  onClearAll
}: ActiveFiltersDisplayProps) {
  const hasFilters = biotypes.length > 0 || featureTypes.length > 0 || pipelines.length > 0 || providers.length > 0 || (source && source !== "all") || mostRecentPerSpecies

  if (!hasFilters) return null

  return (
    <div className="flex items-center gap-2 flex-wrap p-4 bg-muted/20 rounded-lg border">
      <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
      {source && source !== "all" && (
        <Badge variant="secondary" className="text-xs">
          Source: {source}
        </Badge>
      )}
      {biotypes.map((biotype) => (
        <Badge key={biotype} variant="secondary" className="text-xs">
          Biotype: {biotype}
        </Badge>
      ))}
      {featureTypes.map((type) => (
        <Badge key={type} variant="secondary" className="text-xs">
          Type: {type}
        </Badge>
      ))}
      {pipelines.map((pipeline) => (
        <Badge key={pipeline} variant="secondary" className="text-xs">
          Pipeline: {pipeline}
        </Badge>
      ))}
      {providers.map((provider) => (
        <Badge key={provider} variant="secondary" className="text-xs">
          Provider: {provider}
        </Badge>
      ))}
      {mostRecentPerSpecies && (
        <Badge variant="secondary" className="text-xs">
          Most Recent per Species
        </Badge>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-6 ml-auto text-xs text-muted-foreground hover:text-destructive"
      >
        <X className="h-3 w-3 mr-1" />
        Clear all
      </Button>
    </div>
  )
}

