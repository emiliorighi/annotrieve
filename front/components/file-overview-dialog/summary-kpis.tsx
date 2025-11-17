"use client"

import { Card } from "@/components/ui/card"
import { calculateKPIs } from "../file-overview-dialog-helpers"

interface SummaryKPIsProps {
  stats: any
}

export function SummaryKPIs({ stats }: SummaryKPIsProps) {
  const kpis = calculateKPIs(stats)

  return (
    <Card className="p-4">
      <h4 className="text-sm font-semibold mb-4">Summary / KPIs</h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Total Genes</p>
          <p className="text-lg font-semibold">{kpis.totalGenes.toLocaleString()}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Total Transcripts</p>
          <p className="text-lg font-semibold">{kpis.totalTranscripts.toLocaleString()}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Avg Exons/Transcript</p>
          <p className="text-lg font-semibold">{kpis.avgExonsPerTranscript}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Mean Gene Length</p>
          <p className="text-lg font-semibold">{kpis.meanGeneLength.toLocaleString()} bp</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Gene Length Range</p>
          <p className="text-sm font-semibold">
            {kpis.shortestGene !== Infinity ? `${kpis.shortestGene.toLocaleString()}` : 'N/A'} - {kpis.longestGene > 0 ? kpis.longestGene.toLocaleString() : 'N/A'} bp
          </p>
        </div>
      </div>
    </Card>
  )
}

