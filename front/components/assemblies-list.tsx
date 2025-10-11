"use client"

import { Badge } from "@/components/ui/badge"
import { listAssemblies } from "@/lib/api/assemblies"
import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Building2, Calendar, Database, Info, ChevronLeft, ChevronRight, FileText, PawPrint, ExternalLink } from "lucide-react"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { getAssembliesStats } from "@/lib/api/assemblies"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

interface AssembliesListProps {
  taxid: string
  onAssembliesSelectionChange?: (accessions: string[]) => void
  onAssemblySelect?: (accession: string) => void
  onJBrowseChange?: (accession: string, annotationId?: string) => void
  view: 'taxon' | 'organism'
}

export function AssembliesList({ taxid, onAssembliesSelectionChange, onAssemblySelect, onJBrowseChange, view }: AssembliesListProps) {
  const [assemblies, setAssemblies] = useState<Record<string, any>[]>([])
  const [totalAssemblies, setTotalAssemblies] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAssemblies, setSelectedAssemblies] = useState<Set<string>>(new Set())
  const [submitters, setSubmitters] = useState<Record<string, number>>({})
  const [selectedSubmitter, setSelectedSubmitter] = useState<string | null>(null)
  const [submittersLoading, setSubmittersLoading] = useState<boolean>(false)
  const [submittersError, setSubmittersError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('release_date')
  const [sortOrder, setSortOrder] = useState<string>('desc')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage] = useState<number>(6)

  // Fetch assemblies when organism, sort, or filters change
  useEffect(() => {
    let cancelled = false

    async function fetchAssemblies() {
      if (!taxid) return
      setLoading(true)
      setError(null)
      try {
        const offset = (currentPage - 1) * itemsPerPage
        const params: any = {
          taxids: taxid,
          limit: itemsPerPage,
          offset: offset,
          sort_by: sortBy,
          sort_order: sortOrder
        }
        // Only add submitters filter if one is selected
        if (selectedSubmitter) {
          params.submitters = selectedSubmitter
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
  }, [taxid, sortBy, sortOrder, selectedSubmitter, currentPage, itemsPerPage])

  // Fetch submitters only once when organism changes
  useEffect(() => {
    let cancelled = false

    async function fetchSubmitters() {
      if (!taxid) return
      setSubmittersLoading(true)
      setSubmittersError(null)
      try {
        const res = await getAssembliesStats({ taxids: taxid }, 'submitter')
        if (cancelled) return
        setSubmitters(res || {})
      } catch (e: any) {
        if (!cancelled) setSubmittersError(e?.message || "Failed to load submitters")
      } finally {
        if (!cancelled) setSubmittersLoading(false)
      }
    }

    fetchSubmitters()
    return () => { cancelled = true }
  }, [taxid])

  // Clear selected assemblies when taxid changes
  useEffect(() => {
    setSelectedAssemblies(new Set())
  }, [taxid])

  const toggleAssemblySelection = (accession: string) => {
    setSelectedAssemblies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(accession)) {
        newSet.delete(accession)
      } else {
        newSet.add(accession)
      }
      // Notify parent component of selection change
      if (onAssembliesSelectionChange) {
        onAssembliesSelectionChange(Array.from(newSet))
      }
      return newSet
    })
  }

  const clearAllSelections = () => {
    setSelectedAssemblies(new Set())
    // Notify parent component of selection change
    if (onAssembliesSelectionChange) {
      onAssembliesSelectionChange([])
    }
  }

  const handleSort = () => {
    // Toggle sort order for release_date
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    setCurrentPage(1) // Reset to first page when sorting changes
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
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first page, last page, current page and neighbors
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

  return (
    <div>
      <div className="flex justify-between align-center mb-4">
        <div className="flex items-center align-center gap-2">
          <h4 className="text-lg font-semibold">Available Assemblies ({totalAssemblies})</h4>
          <Button variant="ghost" size="icon" onClick={() => {
            alert("Select one or more assemblies to see the related annotations; use right click to see the context menu")
          }}>
            <Info className="h-4 w-4" />
          </Button>
          {selectedAssemblies.size > 0 && (
            <Badge
              variant="default"
              className="ml-2 cursor-pointer hover:bg-primary/80 transition-colors"
              onClick={clearAllSelections}
            >
              {selectedAssemblies.size} selected (click to clear)
            </Badge>
          )}
        </div>
        <div className="flex items-center align-center gap-2">
          {submittersLoading && <div className="text-sm text-muted-foreground">Loading submitters...</div>}
          {submittersError && <div className="text-sm text-red-500">{submittersError}</div>}
          {!submittersLoading && !submittersError && (
            <Select value={selectedSubmitter || "all"} onValueChange={(value) => {
              setSelectedSubmitter(value === "all" ? null : value)
              setCurrentPage(1) // Reset to first page when filter changes
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All submitters" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                <SelectItem value="all">All submitters</SelectItem>
                {Object.entries(submitters).map(([submitter, count]) => (
                  <SelectItem key={submitter} value={submitter}>{submitter} ({count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={handleSort} className="ml-2 gap-2">
            {sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </Button>
        </div>
      </div>
      {loading && <div className="text-sm text-muted-foreground animate-in slide-in-from-top-2 fade-in duration-200">Loading assemblies...</div>}
      {error && <div className="text-sm text-red-500 animate-in slide-in-from-top-2 fade-in duration-200">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
          {assemblies.map((assembly: any) => {
            const isSelected = selectedAssemblies.has(assembly.assembly_accession)
            return (
              <ContextMenu key={assembly.assembly_accession}>
                <ContextMenuTrigger asChild>
                  <div onClick={() => toggleAssemblySelection(assembly.assembly_accession)} className={`border rounded-lg p-4 flex justify-between align-center cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted/30'
                    }`}>
                    <div className="flex-col gap-4">
                      <div className="flex items-center">
                        <span className="font-mono text-md">{assembly.assembly_name}</span>
                        {isSelected && (
                          <Badge variant="default" className="ml-2 animate-in fade-in zoom-in duration-200">Selected</Badge>
                        )}
                      </div>
                      <div className="flex gap-4 mt-4">
                        {view === 'taxon' && (
                          <div className="flex items-start gap-2">
                            <PawPrint className="h-5 w-5 text-primary mt-0.5" />
                            <div className="flex-1">
                              <div className="font-mono text-sm italic text-muted-foreground">{assembly.organism_name}</div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <Database className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <div className="font-mono text-sm text-muted-foreground">{assembly.assembly_accession}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Calendar className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground">
                              {new Date(assembly.release_date as string).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Building2 className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm text-muted-foreground">{assembly.submitter as string}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm text-muted-foreground">Annotations</span>
                      <h3 className="text-2xl font-bold text-primary">{assembly.annotations_count as number}</h3>
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
                    onClick={(e) => {
                      e.stopPropagation()
                      onJBrowseChange?.(assembly.assembly_accession)
                    }}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View in Genome Browser</span>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
          {assemblies.length === 0 && (
            <div className="text-sm text-muted-foreground animate-in slide-in-from-top-2 fade-in duration-200">No assemblies found for this organism.</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalAssemblies > itemsPerPage && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
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
  )
}
