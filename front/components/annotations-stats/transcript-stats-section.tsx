"use client"

import { Card } from "@/components/ui"
import { Database, Activity, FileText } from "lucide-react"
import type { TranscriptStatsSummary } from "@/lib/api/annotations"

interface TranscriptStatsSectionProps {
  stats: TranscriptStatsSummary | null
  loading: boolean
}

export function TranscriptStatsSection({ stats, loading }: TranscriptStatsSectionProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading transcript statistics...</p>
          </div>
        </div>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No transcript statistics available</p>
        </div>
      </Card>
    )
  }

  const types = stats.types || []
  const transcriptStats = stats.summary?.types || {}

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Transcript Statistics</h2>
      </div>
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Total annotations: <span className="font-semibold text-foreground">{stats.total_annotations}</span>
        </div>
        
        {types.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {types.map((type) => {
                const typeData = transcriptStats[type]
                if (!typeData) return null
                
                return (
                  <div key={type} className="border rounded-lg p-4 space-y-2">
                    <h4 className="font-medium capitalize">{type.replace(/_/g, ' ')}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="text-muted-foreground">
                        Annotations with this type: <span className="font-semibold text-foreground">{typeData.annotations_count || 0}</span>
                      </div>
                      {typeData.missing_annotations_count !== undefined && (
                        <div className="text-muted-foreground">
                          Missing: <span className="font-semibold text-foreground">{typeData.missing_annotations_count}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 pt-2 border-t">
                      {typeData.average_count !== undefined && typeData.average_count !== null && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Average count:</span>{' '}
                          <span className="font-medium">{typeData.average_count.toFixed(2)}</span>
                        </div>
                      )}
                      {typeData.average_mean_length !== undefined && typeData.average_mean_length !== null && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Average mean length:</span>{' '}
                          <span className="font-medium">{typeData.average_mean_length.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

