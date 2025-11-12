"use client"

import { Database, Calendar, Building2, ExternalLink, Download, ChevronDown } from "lucide-react"
import type { AssemblyRecord } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface AssemblyDetailPopoverProps {
  details: AssemblyRecord | undefined
  isLoading: boolean
}

export function AssemblyDetailPopover({ details, isLoading }: AssemblyDetailPopoverProps) {
  const router = useRouter()
  const [isStatsOpen, setIsStatsOpen] = useState(false)

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading assembly details...</div>
  }

  if (!details) {
    return <div className="p-6 text-center text-muted-foreground">Failed to load assembly details</div>
  }

  const assemblyLevel = String(details.assembly_level || "")
  const canViewInBrowser = assemblyLevel === "Chromosome" || assemblyLevel === "Complete Genome"
  const hasDownloadUrl = !!details.download_url
  const hasStats = !!details.assembly_stats

  const formatNumber = (num: string | number) => {
    return Number(num).toLocaleString()
  }

  const formatFieldName = (key: string): string => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const formatStatValue = (key: string, value: any): string => {
    // Format based on the field type
    if (key.includes("length")) {
      if (value > 1000000000) { //gb
        return `${formatNumber(value / 1000000000)} Gb`
      }
      if (value > 1000000) { //mb
        return `${formatNumber(value / 1000000)} Mb`
      }
      if (value > 1000) { //kb
        return `${formatNumber(value / 1000)} Kb`
      }
      return `${formatNumber(value)} bp` //b by default
    }
    if (key.includes("percent")) {
      return `${value}%`
    }
    if (key === "genome_coverage") {
      return `${value}x`
    }
    if (key === "atgc_count" || key === "gc_count") {
      return formatNumber(value)
    }
    if (typeof value === "number") {
      return formatNumber(value)
    }
    return value.toString()
  }

  const handleViewInBrowser = () => {
    router.push(`/jbrowse/?accession=${details.assembly_accession}`)
  }

  const handleDownload = () => {
    if (!details.download_url) return
    const link = document.createElement('a')
    link.href = details.download_url as string
    link.download = ''
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-3">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold mb-0.5 leading-tight">{details.assembly_name}</h3>
            <p className="text-xs text-muted-foreground">{details.organism_name}</p>
          </div>
          {details.annotations_count !== undefined && (
            <div className="flex-shrink-0 text-right">
              <div className="text-xs font-medium text-muted-foreground">Annotations</div>
              <div className="text-sm font-semibold">{details.annotations_count.toLocaleString()}</div>
            </div>
          )}
        </div>

        {/* Key Info Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-start gap-1.5 p-2 border rounded-md bg-muted/30">
            <Database className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-medium mb-0.5 text-muted-foreground uppercase tracking-wide">Accession</div>
              <div className="font-mono text-xs truncate leading-tight">{details.assembly_accession}</div>
            </div>
          </div>
          {details.release_date && (
            <div className="flex items-start gap-1.5 p-2 border rounded-md bg-muted/30">
              <Calendar className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-medium mb-0.5 text-muted-foreground uppercase tracking-wide">Release Date</div>
                <div className="text-xs leading-tight">
                  {new Date(details.release_date as string).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submitter */}
        {details.submitter && (
          <div className="flex items-start gap-1.5 p-2 border rounded-md bg-muted/30">
            <Building2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-medium mb-0.5 text-muted-foreground uppercase tracking-wide">Submitter</div>
              <div className="text-xs truncate leading-tight">{details.submitter as string}</div>
            </div>
          </div>
        )}

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          {(() => {
            const level = details.assembly_level
            return level ? (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Level:</span>
                <span className="font-medium">{String(level)}</span>
              </div>
            ) : null
          })()}
          {(() => {
            const status = details.assembly_status
            return status ? (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium">{String(status)}</span>
              </div>
            ) : null
          })()}
          {(() => {
            const category = details.refseq_category
            return category ? (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">RefSeq:</span>
                <span className="font-medium">{String(category)}</span>
              </div>
            ) : null
          })()}
        </div>

        {/* Assembly Stats */}
        {hasStats && (
          <Collapsible open={isStatsOpen} onOpenChange={setIsStatsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-7 text-xs px-2 -mx-2 [&[data-state=open]>svg]:rotate-180"
              >
                <span className="font-medium">Assembly Statistics</span>
                <ChevronDown className="h-3 w-3 transition-transform duration-200" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="max-h-[200px] overflow-y-auto text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="grid grid-cols-2 gap-2 pt-2">
                {Object.entries(details.assembly_stats || {}).map(([key, value]) => (
                  <div key={key} className="bg-muted/30 rounded-md p-2 border">
                    <div className="text-[10px] font-medium mb-0.5 text-muted-foreground uppercase tracking-wide">{formatFieldName(key)}</div>
                    <div className="text-xs font-semibold">{formatStatValue(key, value)}</div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Actions */}
        {(canViewInBrowser || hasDownloadUrl) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {canViewInBrowser && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs px-2.5"
                onClick={handleViewInBrowser}
              >
                <ExternalLink className="h-3 w-3" />
                View in Browser
              </Button>
            )}
            {hasDownloadUrl && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs px-2.5"
                onClick={handleDownload}
              >
                <Download className="h-3 w-3" />
                Download
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

