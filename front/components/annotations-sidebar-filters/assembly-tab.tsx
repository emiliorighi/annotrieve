"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Accordion } from "@/components/ui/accordion"
import { Search, Calendar, Database, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Loader2, Star } from "lucide-react"
import type { AssemblyRecord } from "@/lib/api/types"
import { cn } from "@/lib/utils"

interface AssemblyTabProps {
  selectedAssemblyAccessions: string[]
  onAssemblyAccessionsChange: (accessions: string[]) => void
  selectedAssemblyLevels: string[]
  onAssemblyLevelsChange: (levels: string[]) => void
  selectedAssemblyStatuses: string[]
  onAssemblyStatusesChange: (statuses: string[]) => void
  selectedRefseqCategories: string[]
  onRefseqCategoriesChange: (categories: string[]) => void
  assemblyLevelOptions: Record<string, number>
  assemblyStatusOptions: Record<string, number>
  refseqCategoryOptions: Record<string, number>
  loadingSection: string | null
  assemblyAccordionValue: string | undefined
  onAssemblyAccordionChange: (value: string | undefined) => void
  renderFilterSection: (
    title: string,
    options: Record<string, number>,
    selected: string[],
    onChange: (values: string[]) => void,
    key: string,
    isLoading: boolean
  ) => JSX.Element
  assemblySearchQuery: string
  setAssemblySearchQuery: (query: string) => void
  assemblySearchResults: AssemblyRecord[]
  assemblySearchLoading: boolean
  onAssemblySelect: (assembly: AssemblyRecord) => void
  browseAssemblies: AssemblyRecord[]
  browseAssembliesLoading: boolean
  browseAssembliesTotal: number
  browseAssembliesPage: number
  setBrowseAssembliesPage: (page: number | ((prev: number) => number)) => void
  browseAssembliesSortBy: 'release_date' | 'annotations_count'
  setBrowseAssembliesSortBy: (sortBy: 'release_date' | 'annotations_count') => void
  browseAssembliesSortOrder: 'asc' | 'desc'
  setBrowseAssembliesSortOrder: (sortOrder: 'asc' | 'desc') => void
  browseAssembliesItemsPerPage: number
}

export function AssemblyTab({
  selectedAssemblyAccessions,
  selectedAssemblyLevels,
  onAssemblyLevelsChange,
  selectedAssemblyStatuses,
  onAssemblyStatusesChange,
  selectedRefseqCategories,
  onRefseqCategoriesChange,
  assemblyLevelOptions,
  assemblyStatusOptions,
  refseqCategoryOptions,
  loadingSection,
  assemblyAccordionValue,
  onAssemblyAccordionChange,
  renderFilterSection,
  assemblySearchQuery,
  setAssemblySearchQuery,
  assemblySearchResults,
  assemblySearchLoading,
  onAssemblySelect,
  browseAssemblies,
  browseAssembliesLoading,
  browseAssembliesTotal,
  browseAssembliesPage,
  setBrowseAssembliesPage,
  browseAssembliesSortBy,
  setBrowseAssembliesSortBy,
  browseAssembliesSortOrder,
  setBrowseAssembliesSortOrder,
  browseAssembliesItemsPerPage,
}: AssemblyTabProps) {
  return (
    <div className="space-y-8">
      {/* Assembly Metadata Filters */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Assembly Filters</Label>
          <p className="text-xs text-muted-foreground">
            These filters apply to both the assembly list below and the annotations list.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <Accordion
            type="single"
            className="w-full"
            value={assemblyAccordionValue}
            onValueChange={onAssemblyAccordionChange}
            collapsible
          >
            {renderFilterSection(
              "Assembly Levels",
              assemblyLevelOptions,
              selectedAssemblyLevels,
              onAssemblyLevelsChange,
              "assembly-levels",
              loadingSection === "assembly-levels"
            )}
            {renderFilterSection(
              "Assembly Statuses",
              assemblyStatusOptions,
              selectedAssemblyStatuses,
              onAssemblyStatusesChange,
              "assembly-statuses",
              loadingSection === "assembly-statuses"
            )}
            {renderFilterSection(
              "RefSeq Categories",
              refseqCategoryOptions,
              selectedRefseqCategories,
              onRefseqCategoriesChange,
              "refseq-categories",
              loadingSection === "refseq-categories"
            )}
          </Accordion>
        </div>
      </div>

      {/* Browse and Search Assemblies */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Browse Assemblies</Label>
        </div>
        
        <div className="rounded-lg border bg-card p-4 space-y-4">
          {/* Assembly Search */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or accession..."
                value={assemblySearchQuery}
                onChange={(e) => setAssemblySearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Search Results */}
            {assemblySearchLoading && (
              <div className="text-xs text-muted-foreground py-2">Searching...</div>
            )}
            {assemblySearchQuery && !assemblySearchLoading && assemblySearchResults.length > 0 && (
              <div className="border rounded-md bg-background p-2 space-y-2 max-h-48 overflow-y-auto">
                {assemblySearchResults.map((assembly) => (
                  <div
                    key={assembly.assembly_accession}
                    onClick={() => onAssemblySelect(assembly)}
                    className="p-2 hover:bg-muted rounded cursor-pointer text-sm transition-colors"
                  >
                    <div className="font-medium">{assembly.assembly_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {assembly.assembly_accession} · {assembly.organism_name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assembly List with Sorting */}
          {!assemblySearchQuery && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground font-medium">Sort by</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => {
                      const newSortBy = browseAssembliesSortBy === 'release_date' ? 'annotations_count' : 'release_date'
                      setBrowseAssembliesSortBy(newSortBy)
                      setBrowseAssembliesPage(1)
                    }}
                    title={`Sort by ${browseAssembliesSortBy === 'release_date' ? 'annotations count' : 'release date'}`}
                  >
                    {browseAssembliesSortBy === 'release_date' ? (
                      <>
                        <Calendar className="h-3 w-3 mr-1" />
                        Date
                      </>
                    ) : (
                      <>
                        <Database className="h-3 w-3 mr-1" />
                        Count
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => {
                      setBrowseAssembliesSortOrder(browseAssembliesSortOrder === 'desc' ? 'asc' : 'desc')
                      setBrowseAssembliesPage(1)
                    }}
                    title={browseAssembliesSortOrder === 'desc' ? 'Sort ascending' : 'Sort descending'}
                  >
                    {browseAssembliesSortOrder === 'desc' ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUp className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {browseAssembliesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : browseAssemblies.length === 0 ? (
                <div className="text-xs text-muted-foreground py-8 text-center">
                  No assemblies found
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {browseAssemblies.map((assembly) => {
                      const refseqCategory = assembly.refseq_category as string | undefined
                      const isReferenceGenome = refseqCategory?.toLowerCase() === 'reference genome'
                      return (
                        <div
                          key={assembly.assembly_accession}
                          onClick={() => onAssemblySelect(assembly)}
                          className={cn(
                            "border rounded-lg p-3 cursor-pointer transition-colors relative bg-background",
                            "hover:bg-muted/50 hover:border-primary/50",
                            selectedAssemblyAccessions.includes(assembly.assembly_accession) && "bg-primary/10 border-primary/50"
                          )}
                        >
                          {/* Badges in top right corner */}
                          <div className="absolute top-3 right-3 flex items-center gap-1 flex-wrap justify-end max-w-[40%]">
                            {refseqCategory && (
                              <Badge
                                variant={isReferenceGenome ? "default" : "outline"}
                                className={cn(
                                  "text-xs px-1.5 py-0 h-4 flex items-center gap-0.5",
                                  isReferenceGenome && "bg-primary text-primary-foreground"
                                )}
                              >
                                {isReferenceGenome && <Star className="h-2.5 w-2.5 fill-current" />}
                                reference
                              </Badge>
                            )}
                            {(assembly.assembly_level as string | undefined) && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                                {String(assembly.assembly_level)}
                              </Badge>
                            )}
                            {(assembly.assembly_status as string | undefined) && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                                {String(assembly.assembly_status)}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-start justify-between gap-2 pr-[45%]">
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="text-xs font-medium truncate" title={assembly.assembly_name}>
                                {assembly.assembly_name}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {assembly.assembly_accession}
                              </div>
                              {assembly.organism_name && (
                                <div className="text-xs text-muted-foreground italic">
                                  {assembly.organism_name}
                                </div>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                {assembly.release_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(assembly.release_date).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric"
                                    })}
                                  </span>
                                )}
                                {assembly.annotations_count !== undefined && (
                                  <span className="flex items-center gap-1">
                                    <Database className="h-3 w-3" />
                                    {assembly.annotations_count.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Pagination */}
                  {browseAssembliesTotal > browseAssembliesItemsPerPage && (
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        Page {browseAssembliesPage} of {Math.ceil(browseAssembliesTotal / browseAssembliesItemsPerPage)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setBrowseAssembliesPage(prev => Math.max(1, prev - 1))}
                          disabled={browseAssembliesPage === 1 || browseAssembliesLoading}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setBrowseAssembliesPage(prev => prev + 1)}
                          disabled={browseAssembliesPage >= Math.ceil(browseAssembliesTotal / browseAssembliesItemsPerPage) || browseAssembliesLoading}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

