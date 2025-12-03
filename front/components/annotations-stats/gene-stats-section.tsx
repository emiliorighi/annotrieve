"use client"

import { Card } from "@/components/ui"
import { Database, Activity, Dna } from "lucide-react"
import type { GeneStatsSummary } from "@/lib/api/annotations"

interface GeneStatsSectionProps {
  stats: GeneStatsSummary | null
  loading: boolean
}

export function GeneStatsSection({ stats, loading }: GeneStatsSectionProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading gene statistics...</p>
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
          <p>No gene statistics available</p>
        </div>
      </Card>
    )
  }

  const categories = stats.categories || []
  const geneStats = stats.summary?.genes || {}

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Dna className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Gene Statistics</h2>
      </div>
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Total annotations: <span className="font-semibold text-foreground">{stats.total_annotations}</span>
        </div>
        
        {categories.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Categories</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const categoryData = geneStats[category]
                if (!categoryData) return null
                
                return (
                  <div key={category} className="border rounded-lg p-4 space-y-2">
                    <h4 className="font-medium capitalize">{category.replace(/_/g, ' ')}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="text-muted-foreground">
                        Annotations with this category: <span className="font-semibold text-foreground">{categoryData.annotations_count || 0}</span>
                      </div>
                      {categoryData.missing_annotations_count !== undefined && (
                        <div className="text-muted-foreground">
                          Missing: <span className="font-semibold text-foreground">{categoryData.missing_annotations_count}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 pt-2 border-t">
                      {categoryData.average_count !== undefined && categoryData.average_count !== null && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Average count:</span>{' '}
                          <span className="font-medium">{categoryData.average_count.toFixed(2)}</span>
                        </div>
                      )}
                      {categoryData.average_mean_length !== undefined && categoryData.average_mean_length !== null && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Average mean length:</span>{' '}
                          <span className="font-medium">{categoryData.average_mean_length.toFixed(2)}</span>
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

