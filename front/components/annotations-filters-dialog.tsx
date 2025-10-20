"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Filter, X, Star } from "lucide-react"

interface FiltersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  biotypes: string[]
  setBiotypes: (biotypes: string[]) => void
  featureTypes: string[]
  setFeatureTypes: (types: string[]) => void
  pipelines: string[]
  setPipelines: (pipelines: string[]) => void
  providers: string[]
  setProviders: (providers: string[]) => void
  source: string
  setSource: (source: string) => void
  mostRecentPerSpecies: boolean
  setMostRecentPerSpecies: (value: boolean) => void
  biotypeOptions: string[]
  featureTypeOptions: string[]
  pipelineOptions: string[]
  providerOptions: string[]
  sourceOptions: string[]
  onFilterChange: () => void
  onClearAll: () => void
  currentHitCount: number
}

export function AnnotationsFiltersDialog({
  open,
  onOpenChange,
  biotypes,
  setBiotypes,
  featureTypes,
  setFeatureTypes,
  pipelines,
  setPipelines,
  providers,
  setProviders,
  source,
  setSource,
  mostRecentPerSpecies,
  setMostRecentPerSpecies,
  biotypeOptions,
  featureTypeOptions,
  pipelineOptions,
  providerOptions,
  sourceOptions,
  onFilterChange,
  onClearAll,
  currentHitCount
}: FiltersDialogProps) {
  const hasActiveFilters = biotypes.length > 0 || featureTypes.length > 0 || pipelines.length > 0 || providers.length > 0 || (source && source !== "all") || mostRecentPerSpecies

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Annotations
          </DialogTitle>
          <DialogDescription>
            Apply filters to refine your annotation results. Filters affect both List and Statistics views.
          </DialogDescription>
          <div className="flex items-center gap-2">
            <Badge variant={currentHitCount === 0 ? "destructive" : currentHitCount < 10 ? "secondary" : "default"}>
              {currentHitCount.toLocaleString()} result{currentHitCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className={`flex items-center justify-between p-4 rounded-lg border ${
              currentHitCount === 0 
                ? "bg-destructive/10 border-destructive/20" 
                : "bg-primary/10 border-primary/20"
            }`}>
              <div className="flex items-center gap-2">
                <Badge variant={currentHitCount === 0 ? "destructive" : "default"} className="text-sm">
                  {biotypes.length + featureTypes.length + pipelines.length + providers.length + (source && source !== "all" ? 1 : 0) + (mostRecentPerSpecies ? 1 : 0)} active
                </Badge>
                <span className={`text-sm font-medium ${currentHitCount === 0 ? "text-destructive" : "text-foreground"}`}>
                  {biotypes.length + featureTypes.length + pipelines.length + providers.length + (source && source !== "all" ? 1 : 0) + (mostRecentPerSpecies ? 1 : 0)} filter{(biotypes.length + featureTypes.length + pipelines.length + providers.length + (source && source !== "all" ? 1 : 0) + (mostRecentPerSpecies ? 1 : 0)) !== 1 ? 's' : ''} applied
                  {currentHitCount === 0 && " - No results found"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="h-8"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          )}

          {/* All Filters Grid */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Biotypes Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Biotypes</label>
                <Select value="" onValueChange={(value) => {
                  if (value && !biotypes.includes(value)) {
                    setBiotypes([...biotypes, value])
                    onFilterChange()
                  }
                }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Add biotypes..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {biotypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {biotypes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {biotypes.map((biotype) => (
                      <Badge key={biotype} variant="secondary" className="text-xs px-2 py-1">
                        {biotype}
                        <button
                          onClick={() => {
                            setBiotypes(biotypes.filter(b => b !== biotype))
                            onFilterChange()
                          }}
                          className="ml-2 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Feature Types Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Feature Types</label>
                <Select value="" onValueChange={(value) => {
                  if (value && !featureTypes.includes(value)) {
                    setFeatureTypes([...featureTypes, value])
                    onFilterChange()
                  }
                }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Add feature types..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {featureTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {featureTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {featureTypes.map((type) => (
                      <Badge key={type} variant="secondary" className="text-xs px-2 py-1">
                        {type}
                        <button
                          onClick={() => {
                            setFeatureTypes(featureTypes.filter(t => t !== type))
                            onFilterChange()
                          }}
                          className="ml-2 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Pipelines Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Pipelines</label>
                <Select value="" onValueChange={(value) => {
                  if (value && !pipelines.includes(value)) {
                    setPipelines([...pipelines, value])
                    onFilterChange()
                  }
                }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Add pipelines..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {pipelineOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pipelines.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pipelines.map((pipeline) => (
                      <Badge key={pipeline} variant="secondary" className="text-xs px-2 py-1">
                        {pipeline}
                        <button
                          onClick={() => {
                            setPipelines(pipelines.filter(p => p !== pipeline))
                            onFilterChange()
                          }}
                          className="ml-2 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Providers Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Providers</label>
                <Select value="" onValueChange={(value) => {
                  if (value && !providers.includes(value)) {
                    setProviders([...providers, value])
                    onFilterChange()
                  }
                }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Add providers..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {providerOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {providers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {providers.map((provider) => (
                      <Badge key={provider} variant="secondary" className="text-xs px-2 py-1">
                        {provider}
                        <button
                          onClick={() => {
                            setProviders(providers.filter(p => p !== provider))
                            onFilterChange()
                          }}
                          className="ml-2 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Source Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Source</label>
                <Select value={source} onValueChange={(value) => {
                  setSource(value)
                  onFilterChange()
                }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All Sources</SelectItem>
                    {sourceOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {source && source !== "all" && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs px-2 py-1">
                      {source}
                      <button
                        onClick={() => {
                          setSource("all")
                          onFilterChange()
                        }}
                        className="ml-2 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Most Recent Per Species Toggle */}
            <div className="border-t pt-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Special Filters</label>
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className={`h-4 w-4 ${mostRecentPerSpecies ? 'text-primary fill-current' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-medium text-foreground">Most Recent per Species</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Show only the most recent annotation for each species based on release date
                      </p>
                    </div>
                    <Button
                      variant={mostRecentPerSpecies ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setMostRecentPerSpecies(!mostRecentPerSpecies)
                        onFilterChange()
                      }}
                      className="h-9"
                    >
                      {mostRecentPerSpecies ? "On" : "Off"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

