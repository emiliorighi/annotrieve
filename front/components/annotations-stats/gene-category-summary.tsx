"use client"

import { useState, useEffect, type ReactNode } from "react"
import { Card } from "@/components/ui"
import { Activity, Dna } from "lucide-react"
import { getGeneCategoryDetails, type GeneCategoryDetails } from "@/lib/api/annotations"
import { useAnnotationsFiltersStore } from "@/lib/stores/annotations-filters"

interface GeneCategorySummaryProps {
  category: string
  params?: Record<string, any>
  children?: ReactNode
}

export function GeneCategorySummary({ category, params = {}, children }: GeneCategorySummaryProps) {
  const [details, setDetails] = useState<GeneCategoryDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const buildAnnotationsParams = useAnnotationsFiltersStore((state) => state.buildAnnotationsParams)

  useEffect(() => {
    if (!category) return
    
    let cancelled = false

    async function fetchDetails() {
      try {
        setLoading(true)
        setError(null)
        const filterParams = buildAnnotationsParams(false, [])
        // Remove pagination params
        delete filterParams.limit
        delete filterParams.offset
        
        const result = await getGeneCategoryDetails(category, { ...filterParams, ...params })
        if (!cancelled) {
          setDetails(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load category details')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchDetails()
    return () => {
      cancelled = true
    }
  }, [category, JSON.stringify(params)])

  const formatLabel = (str: string) => {
    return str.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const formatMetricLabel = (metric: string) => {
    const formatted = formatLabel(metric)
    const lowerFormatted = formatted.toLowerCase()
    let result: string
    if (lowerFormatted.startsWith('average')) {
      result = formatted
    } else {
      result = `Average ${formatted}`
    }
    // Ensure first character is uppercase
    return result.charAt(0).toUpperCase() + result.slice(1)
  }

  if (!category) {
    return null
  }

  return (
    <Card className="p-4 relative">
      {loading && details && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <Activity className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        </div>
      )}
      
      {loading && !details ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading category details...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center text-destructive">
          <p>{error}</p>
        </div>
      ) : details ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Summary Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Dna className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">{formatLabel(details.category)}</h2>
            </div>


            {details.summary && Object.keys(details.summary).length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-sm font-semibold">Summary Statistics</h3>
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(details.summary).map(([metric, values]) => {
                    if (!values || typeof values !== 'object') return null
                    const mean = (values as any).mean
                    
                    if (mean === undefined || mean === null || typeof mean !== 'number' || isNaN(mean)) {
                      return null
                    }
                    
                    return (
                      <div key={metric} className="border rounded-lg p-3 space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">
                          {formatMetricLabel(metric)}
                        </div>
                        <div className="text-lg font-semibold">{mean.toFixed(2)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Histogram */}
          <div className="flex flex-col">
            {children}
          </div>
        </div>
      ) : null}
    </Card>
  )
}

