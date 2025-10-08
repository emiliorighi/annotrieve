"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, FileText, Calendar, HardDrive } from "lucide-react"
import { AnnotationActions } from "@/components/annotation-actions"
import type { FilterType, Annotation } from "@/lib/types"
import { listAnnotations } from "@/lib/api/annotations"

interface AnnotationsListProps {
  filterType: FilterType
  filterObject: Record<string, any>
  selectedAssemblyAccessions?: string[]
}

export function AnnotationsList({ filterType, filterObject, selectedAssemblyAccessions }: AnnotationsListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState<"all" | "GenBank"| "RefSeq" | "Ensembl">("all")
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [totalAnnotations, setTotalAnnotations] = useState<number>(0)

  useEffect(() => {
    async function fetchData() {
      try {
        let params: Record<string, any> = { limit: 100, offset: 0 }
        if (filterType === "organism" || filterType === "taxon") {
          // Expecting object.taxid when filtering by organism or taxon
          params = { ...params, taxids: filterObject?.taxid }
          // If specific assemblies are selected, filter by them
          if (selectedAssemblyAccessions && selectedAssemblyAccessions.length > 0) {
            params = { ...params, assembly_accessions: selectedAssemblyAccessions.join(',') }
          }
        } else if (filterType === "assembly") {
          // Expecting object.assembly_accession when filtering by assembly
          params = { ...params, assembly_accessions: filterObject?.assembly_accession || filterObject?.assemblyAccession }
        }
        const res = await listAnnotations(params as any)
        setAnnotations((res as any)?.results as any)
        setTotalAnnotations((res as any)?.total ?? 0)
      } catch (e) {
        setAnnotations([])
      }
    }
    fetchData()
  }, [filterType, filterObject, selectedAssemblyAccessions])

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold">
          Related Annotations <span className="text-muted-foreground">({totalAnnotations})</span>
        </h3>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search annotations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          <Select value={sourceFilter} onValueChange={(value: any) => setSourceFilter(value)}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="GenBank">GenBank</SelectItem>
              <SelectItem value="RefSeq">RefSeq</SelectItem>
              <SelectItem value="Ensembl">Ensembl</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Annotations list */}
        {annotations.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No annotations found matching your criteria</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {annotations.map((annotation) => (
            <AnnotationCard key={annotation.annotation_id} annotation={annotation} />
          ))}
        </div>
      )}
    </div>
  )
}

function AnnotationCard({ annotation }: { annotation: Annotation }) {
  function convertToHumanReadableSize(file_size: any) {
    const units = ["B", "KB", "MB", "GB", "TB"]
    const index = Math.floor(Math.log10(file_size) / 3)
    return (file_size / Math.pow(1024, index)).toFixed(2) + " " + units[index]
  }
// above the return:
const rootCounts = annotation.features_summary?.root_types_counts ?? {};
const rootCountEntries = Object.entries(rootCounts).sort((a, b) => b[1] - a[1]); // optional: sort desc
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={annotation.source_file_info.database === "GenBank" ? "default" : "secondary"} className="text-xs">
                  {annotation.source_file_info.database}
                </Badge>
                <h4 className="font-mono text-sm font-medium truncate">{annotation.source_file_info.provider}</h4>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="italic">{annotation.organism_name}</span>
                <span>•</span>
                <span className="font-mono">{annotation.assembly_accession}</span>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          {rootCountEntries.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {rootCountEntries.map(([type, count]) => (
                <div key={type} className="bg-muted/50 rounded px-3 py-2">
                  <div className="text-xs text-muted-foreground mb-1">{type}</div>
                  <div className="text-sm font-bold">{count.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5" />
              <span>{convertToHumanReadableSize(annotation.indexed_file_info.file_size)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{annotation.source_file_info.release_date.split("T")[0]}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span className="font-mono">{annotation.assembly_accession}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <AnnotationActions annotation={annotation} />
      </div>
    </Card>
  )
}
