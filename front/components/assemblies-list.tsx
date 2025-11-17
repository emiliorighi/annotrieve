"use client"

import { Badge } from "@/components/ui/badge"
import { listAssemblies } from "@/lib/api/assemblies"
import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Calendar, Database, Info, ChevronLeft, ChevronRight, PawPrint, ExternalLink, ChevronDown, ChevronUp, Filter } from "lucide-react"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useRouter } from "next/navigation"
import { useAnnotationsFiltersStore } from "@/lib/stores/annotations-filters"
import { SelectedEntity, assemblyToEntity } from "./taxonomic-tree-table/selected-entity"
import type { AssemblyRecord } from "@/lib/api/types"

interface AssembliesListProps {
  taxid: string
  onAssembliesSelectionChange?: (accessions: string[]) => void
  onAssemblySelect?: (accession: string) => void
  onJBrowseChange?: (accession: string, annotationId?: string) => void
  view: 'taxon' | 'organism'
}

export function AssembliesList({ taxid, onAssembliesSelectionChange, onAssemblySelect, onJBrowseChange, view }: AssembliesListProps) {
  const [assemblies, setAssemblies] = useState<AssemblyRecord[]>([])
  const [totalAssemblies, setTotalAssemblies] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'release_date' | 'annotations_count'>('release_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage] = useState<number>(6)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [onlySelectedTaxons, setOnlySelectedTaxons] = useState<boolean>(false)
  const router = useRouter()

  // Get selected assemblies and taxons from store
  const selectedAssemblies = useAnnotationsFiltersStore((state) => state.selectedAssemblies)
  const setSelectedAssemblies = useAnnotationsFiltersStore((state) => state.setSelectedAssemblies)
  const selectedTaxons = useAnnotationsFiltersStore((state) => state.selectedTaxons)
  const onlyRefGenomes = useAnnotationsFiltersStore((state) => state.onlyRefGenomes)
  const setOnlyRefGenomes = useAnnotationsFiltersStore((state) => state.setOnlyRefGenomes)

  // Fetch assemblies when filters change
  useEffect(() => {
    let cancelled = false

    async function fetchAssemblies() {
      if (!taxid && !onlySelectedTaxons) return
      setLoading(true)
      setError(null)
      try {
        const offset = (currentPage - 1) * itemsPerPage
        const params: any = {
          limit: itemsPerPage,
          offset: offset,
          sort_by: sortBy,
          sort_order: sortOrder
        }

        // If only selected taxons is enabled and there are selected taxons, use them
        if (onlySelectedTaxons && selectedTaxons.length > 0) {
          params.taxids = selectedTaxons.map(t => t.taxid).join(',')
        } else if (taxid) {
          params.taxids = taxid
        }

        // Add reference genome filter if enabled
        if (onlyRefGenomes) {
          params.refseq_categories = 'reference genome'
        }

        const res = await listAssemblies(params)
        if (cancelled) return
        setAssemblies(res.results || [])
        setTotalAssemblies(res.total ?? 0)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load assemblies")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAssemblies()
    return () => { cancelled = true }
  }, [taxid, sortBy, sortOrder, onlySelectedTaxons, onlyRefGenomes, selectedTaxons, currentPage, itemsPerPage])

  // Clear selected assemblies when taxid changes and not using selected taxons
  useEffect(() => {
    if (!onlySelectedTaxons) {
      setSelectedAssemblies([])
    }
  }, [taxid, onlySelectedTaxons, setSelectedAssemblies])

  const toggleAssemblySelection = (assembly: AssemblyRecord) => {
    const currentSelected = selectedAssemblies
    const accession = assembly.assembly_accession
    const isSelected = currentSelected.some(a => a.assembly_accession === accession)
    
    let newSelected: AssemblyRecord[]
    if (isSelected) {
      newSelected = currentSelected.filter(a => a.assembly_accession !== accession)
    } else {
      newSelected = [...currentSelected, assembly]
    }
    
    setSelectedAssemblies(newSelected)
    // Notify parent component of selection change
    if (onAssembliesSelectionChange) {
      onAssembliesSelectionChange(newSelected.map(a => a.assembly_accession))
    }
  }

  const handleViewInBrowser = (assembly: AssemblyRecord) => {
    router.push(`/jbrowse?accession=${assembly.assembly_accession}`)
  }

  const clearAllSelections = () => {
    setSelectedAssemblies([])
    // Notify parent component of selection change
    if (onAssembliesSelectionChange) {
      onAssembliesSelectionChange([])
    }
  }

  const handleRemoveAssembly = (accession: string) => {
    const newSelected = selectedAssemblies.filter(a => a.assembly_accession !== accession)
    setSelectedAssemblies(newSelected)
    if (onAssembliesSelectionChange) {
      onAssembliesSelectionChange(newSelected.map(a => a.assembly_accession))
    }
  }

  const handleSortByChange = (value: 'release_date' | 'annotations_count') => {
    setSortBy(value)
    setCurrentPage(1)
  }

  const handleSortOrderToggle = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')
    setCurrentPage(1)
  }

  const handleOnlySelectedTaxonsChange = (checked: boolean) => {
    setOnlySelectedTaxons(checked)
    setCurrentPage(1)
  }

  const handleOnlyRefGenomesChange = (checked: boolean) => {
    setOnlyRefGenomes(checked)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalAssemblies / itemsPerPage)

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }

  const handlePageClick = (page: number) => {
    setCurrentPage(page)
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        pages.push(currentPage - 1)
        pages.push(currentPage)
        pages.push(currentPage + 1)
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  // Separate selected and unselected assemblies for display
  // Selected assemblies should be shown first, then unselected ones
  const selectedAssembliesList = assemblies.filter(a => 
    selectedAssemblies.some(sa => sa.assembly_accession === a.assembly_accession)
  )
  const unselectedAssembliesList = assemblies.filter(a => 
    !selectedAssemblies.some(sa => sa.assembly_accession === a.assembly_accession)
  )
  const allDisplayedAssemblies = [...selectedAssembliesList, ...unselectedAssembliesList]

  // Convert all selected assemblies (from store) to entities for display
  const selectedAssemblyEntities = selectedAssemblies.map(assemblyToEntity)

  return (
    <div className="border rounded-lg">
      {/* Toggle Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2 hover:bg-muted"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          <div>
            <h3 className="text-2xl font-bold text-foreground">
              Related Assemblies
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-semibold text-foreground">{totalAssemblies}</span> assembl{totalAssemblies !== 1 ? 'ies' : 'y'} available
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => {
            alert("Select one or more assemblies to filter annotations; use right click to see the context menu")
          }}>
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Selected Taxons Display */}
          {selectedTaxons.length > 0 && (
            <div className="p-3 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Selected Taxons: {selectedTaxons.map(t => t.scientific_name || t.taxid).join(', ')}
                </span>
              </div>
            </div>
          )}

          {/* Selected Assemblies */}
          {selectedAssemblies.length > 0 && (
            <SelectedEntity
              title="Selected Assemblies"
              entities={selectedAssemblyEntities}
              onClear={clearAllSelections}
              onRemove={(accession) => handleRemoveAssembly(accession)}
            />
          )}

          {/* Filters and Controls */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Sort By Select */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="sort-by" className="text-sm font-medium">Sort by:</Label>
                  <Select value={sortBy} onValueChange={handleSortByChange}>
                    <SelectTrigger id="sort-by" className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="release_date">Release Date</SelectItem>
                      <SelectItem value="annotations_count">Annotations Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order Toggle */}
                <Button variant="outline" onClick={handleSortOrderToggle} className="gap-2">
                  {sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                  {sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Only Selected Taxons Toggle */}
              {selectedTaxons.length > 0 && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="only-selected-taxons"
                    checked={onlySelectedTaxons}
                    onCheckedChange={handleOnlySelectedTaxonsChange}
                  />
                  <Label htmlFor="only-selected-taxons" className="text-sm font-medium cursor-pointer">
                    Only assemblies from selected taxons
                  </Label>
                </div>
              )}

              {/* Reference Genome Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="only-ref-genomes"
                  checked={onlyRefGenomes}
                  onCheckedChange={handleOnlyRefGenomesChange}
                />
                <Label htmlFor="only-ref-genomes" className="text-sm font-medium cursor-pointer">
                  Reference genomes only
                </Label>
              </div>
            </div>
          </div>

          {/* Assemblies List */}
          {loading && <div className="text-sm text-muted-foreground animate-in slide-in-from-top-2 fade-in duration-200">Loading assemblies...</div>}
          {error && <div className="text-sm text-red-500 animate-in slide-in-from-top-2 fade-in duration-200">{error}</div>}
          {!loading && !error && (
            <div className="grid grid-cols-1 gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
              {allDisplayedAssemblies.map((assembly) => {
                const isSelected = selectedAssemblies.some(sa => sa.assembly_accession === assembly.assembly_accession)
                return (
                  <ContextMenu key={assembly.assembly_accession}>
                    <ContextMenuTrigger asChild>
                      <div 
                        onClick={() => toggleAssemblySelection(assembly)} 
                        className={`border rounded-lg p-4 flex justify-between items-center cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 ${
                          isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex flex-col gap-4 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-md">{assembly.assembly_name}</span>
                            {isSelected && (
                              <Badge variant="default" className="animate-in fade-in zoom-in duration-200">Selected</Badge>
                            )}
                            {assembly.refseq_category === 'reference genome' && (
                              <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
                                Reference
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-4 flex-wrap">
                            {view === 'taxon' && (
                              <div className="flex items-start gap-2">
                                <PawPrint className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <div className="flex-1">
                                  <div className="font-mono text-sm italic text-muted-foreground">{assembly.organism_name}</div>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-2">
                              <Database className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <div className="font-mono text-sm text-muted-foreground">{assembly.assembly_accession}</div>
                              </div>
                            </div>
                            {assembly.release_date && (
                              <div className="flex items-start gap-2">
                                <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <div className="flex-1">
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(assembly.release_date).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2 ml-4">
                          <span className="text-sm text-muted-foreground">Annotations</span>
                          <h3 className="text-2xl font-bold text-primary">{assembly.annotations_count || 0}</h3>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-56">
                      <ContextMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onAssemblySelect?.(assembly.assembly_accession)
                        }}
                        className="gap-2"
                      >
                        <Info className="h-4 w-4" />
                        <span>View Assembly Details</span>
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => handleViewInBrowser(assembly)}
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>View in Genome Browser</span>
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })}
              {allDisplayedAssemblies.length === 0 && (
                <div className="text-sm text-muted-foreground animate-in slide-in-from-top-2 fade-in duration-200">
                  No assemblies found.
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && totalAssemblies > itemsPerPage && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalAssemblies)} of {totalAssemblies} assemblies
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                    ) : (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageClick(page as number)}
                        className="min-w-[2.5rem]"
                      >
                        {page}
                      </Button>
                    )
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
