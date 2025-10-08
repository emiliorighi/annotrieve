"use client"

import { Calendar, Building2, Database, ExternalLink, Download, Info, ChevronDown, ChevronUp } from "lucide-react"
import { AssemblyRecord } from "@/lib/api/types"
import { ChromosomeViewer } from "./chromosome-viewer"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface AssemblyDetailViewProps {
  assemblyDetails: AssemblyRecord
}

export function AssemblyDetailView({ assemblyDetails }: AssemblyDetailViewProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [showMoreStatistics, setShowMoreStatistics] = useState(false)

  const handleDownload = () => {
    setIsDownloading(true)
    // Simulate download
    setTimeout(() => {
      setIsDownloading(false)
      console.log("[v0] Downloading assembly:", assemblyDetails.assembly_name)
    }, 1500)
  }
  const handleViewInBrowser = () => {
    console.log("[v0] Opening genome browser for:", assemblyDetails.assembly_name)
    // In real implementation, this would open the genome browser
  }

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

  if (!assemblyDetails) {
    return <div className="text-muted-foreground">Assembly not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Main info */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold mb-2">{assemblyDetails.assembly_name}</h2>
            <p className="text-lg text-muted-foreground">{assemblyDetails.organism_name}</p>
          </div>
          <div className="flex items-end justify-between gap-2">
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

        <div className="flex gap-3">
          <Button onClick={handleViewInBrowser} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            View in Genome Browser
          </Button>
          <Button onClick={handleDownload} variant="outline" className="gap-2 bg-transparent" disabled={isDownloading}>
            <Download className="h-4 w-4" />
            {isDownloading ? "Downloading..." : "Download Assembly"}
          </Button>
        </div>
      </div>

      {assemblyDetails.assembly_stats && assemblyDetails.assembly_stats.total_number_of_chromosomes > 0 && (
        <div className="border rounded-lg p-6 bg-muted/30">
          <div className="flex items-center align-center mb-4">
            <h4 className="text-lg font-semibold">Chromosomes</h4>
            <Button variant="ghost" size="icon" onClick={() => {
              alert("Click on a chromosome to see the details")
            }}>
              <Info className="h-4 w-4" />
            </Button>
          </div>
          <ChromosomeViewer accession={assemblyDetails.assembly_accession} />
        </div>
      )}

      {assemblyDetails.assembly_stats && (
        <div className="border rounded-lg p-6">
          <h4 className="text-lg font-semibold mb-4">Assembly Statistics</h4>
          <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-3 xs:grid-cols-1 gap-4">
            {Object.entries(assemblyDetails.assembly_stats).slice(0, 4).map(([key, value]) => (
              <div key={key} className="bg-muted/50 rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">{formatFieldName(key)}</div>
                <div className="text-xl font-bold">{formatStatValue(key, value)}</div>
              </div>
            ))}
          </div>

          {showMoreStatistics && (
              <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-3 xs:grid-cols-1 gap-4 mt-4 animate-in slide-in-from-top-4 fade-in duration-500">
                {Object.entries(assemblyDetails.assembly_stats).slice(4).map(([key, value], index) => (
                  <div 
                    key={key} 
                    className="bg-muted/50 rounded-lg p-4 animate-in slide-in-from-bottom-2 fade-in"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animationDuration: '400ms',
                      animationFillMode: 'both'
                    }}
                  >
                    <div className="text-xs text-muted-foreground mb-1">{formatFieldName(key)}</div>
                    <div className="text-xl font-bold">{formatStatValue(key, value)}</div>
                  </div>
                ))}
              </div>
          )}
          <div className="flex justify-center mt-4">
            <Button variant="ghost" onClick={() => {
              setShowMoreStatistics(!showMoreStatistics)
            }}>
              {showMoreStatistics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showMoreStatistics ? "Show Less" : "Show More"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
