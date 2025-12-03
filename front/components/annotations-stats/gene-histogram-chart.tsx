"use client"

import { useState, useEffect, useMemo } from "react"
import { Card } from "@/components/ui"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { getGeneStats, getGeneCategoryMetricValues, type GeneStatsSummary, type GeneCategoryMetricValues } from "@/lib/api/annotations"
import { useAnnotationsFiltersStore } from "@/lib/stores/annotations-filters"
import { Activity, BarChart3, RotateCcw } from "lucide-react"
import { HistogramChart } from "./histogram-chart"

interface GeneHistogramChartProps {
  params?: Record<string, any>
  selectedCategory?: string | null
}

export function GeneHistogramChart({ params = {}, selectedCategory: propSelectedCategory }: GeneHistogramChartProps) {
  const [geneStats, setGeneStats] = useState<GeneStatsSummary | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedMetric, setSelectedMetric] = useState<string>("")
  const [metricValues, setMetricValues] = useState<GeneCategoryMetricValues | null>(null)
  const [useLogScale, setUseLogScale] = useState(false)
  const [binCount, setBinCount] = useState<number>(30)
  const [loading, setLoading] = useState(true)
  const [loadingValues, setLoadingValues] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const buildAnnotationsParams = useAnnotationsFiltersStore((state) => state.buildAnnotationsParams)

  // Calculate default bin count based on data
  const defaultBinCount = useMemo(() => {
    if (!metricValues || metricValues.values.length === 0) return 30
    return Math.min(500, Math.max(10, Math.floor(metricValues.values.length / 5)))
  }, [metricValues])

  // Reset bin count to default when metric changes
  useEffect(() => {
    if (defaultBinCount > 0) {
      setBinCount(defaultBinCount)
    }
  }, [defaultBinCount, selectedMetric])

  // Update selected category when prop changes
  useEffect(() => {
    if (propSelectedCategory !== null && propSelectedCategory !== undefined) {
      setSelectedCategory(propSelectedCategory)
    } else if (!propSelectedCategory && selectedCategory) {
      // Clear selection when prop becomes null/undefined
      setSelectedCategory("")
    }
  }, [propSelectedCategory, selectedCategory])

  // Fetch gene stats summary
  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        setLoading(true)
        setError(null)
        const filterParams = buildAnnotationsParams(false, [])
        // Remove pagination params
        delete filterParams.limit
        delete filterParams.offset
        
        const result = await getGeneStats({ ...filterParams, ...params })
        if (!cancelled) {
          setGeneStats(result)
          // Auto-select first category if no prop category and no current selection
          // Use functional update to avoid stale closure
          setSelectedCategory((current) => {
            if (!propSelectedCategory && !current && result.categories && result.categories.length > 0) {
              return result.categories[0]
            }
            return current
          })
          // Auto-select first metric if available and none selected
          setSelectedMetric((current) => {
            if (!current && result.metrics && result.metrics.length > 0) {
              return result.metrics[0]
            }
            return current
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load gene statistics')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchStats()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildAnnotationsParams, propSelectedCategory])

  // Fetch metric values when category and metric are selected
  useEffect(() => {
    if (!selectedCategory || !selectedMetric) {
      setMetricValues(null)
      return
    }

    let cancelled = false

    async function fetchValues() {
      try {
        setLoadingValues(true)
        setError(null)
        const filterParams = buildAnnotationsParams(false, [])
        // Remove pagination params
        delete filterParams.limit
        delete filterParams.offset
        
        const result = await getGeneCategoryMetricValues(selectedCategory, selectedMetric, {
          ...filterParams,
          ...params,
        })
        if (!cancelled) {
          setMetricValues(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load metric values')
        }
      } finally {
        if (!cancelled) {
          setLoadingValues(false)
        }
      }
    }

    fetchValues()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedMetric, buildAnnotationsParams])


  const metrics = geneStats?.metrics || []

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

  if (error || !geneStats) {
    return (
      <Card className="p-6">
        <div className="text-center text-destructive">
          <p>{error || 'Failed to load gene statistics'}</p>
        </div>
      </Card>
    )
  }

  const formatLabel = (str: string) => {
    return str.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getMetricDescription = (metric: string) => {
    const lowerMetric = metric.toLowerCase()
    if (lowerMetric.includes('count')) {
      return 'Distribution of counts across annotations. Each bar shows how many annotations have values within that count range.'
    } else if (lowerMetric.includes('length')) {
      return 'Distribution of lengths (in base pairs) across annotations. Each bar shows how many annotations have values within that length range.'
    } else if (lowerMetric.includes('exon')) {
      return 'Distribution of exon-related metrics across annotations. Each bar shows how many annotations have values within that range.'
    } else if (lowerMetric.includes('cds') || lowerMetric.includes('coding')) {
      return 'Distribution of CDS (Coding Sequence) related metrics across annotations. Each bar shows how many annotations have values within that range.'
    }
    return 'Distribution of metric values across annotations. Each bar shows how many annotations have values within that range.'
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Histogram</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Visualizes the distribution of metric values across annotations. The x-axis represents the metric values, the y-axis shows the number of annotations, and the smooth curve indicates the estimated probability density distribution.
        </p>
      </div>
      <div className="space-y-3 flex-1">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="w-[200px]">
            <label className="text-sm font-medium mb-2 block">Metric</label>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger>
                <SelectValue placeholder="Select a metric" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {metrics.map((metric) => (
                  <SelectItem key={metric} value={metric}>
                    {formatLabel(metric)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 pb-2">
            <Checkbox
              id="log-scale-gene"
              checked={useLogScale}
              onCheckedChange={(checked) => setUseLogScale(checked === true)}
            />
            <Label
              htmlFor="log-scale-gene"
              className="text-sm font-medium cursor-pointer"
            >
              Log scale
            </Label>
          </div>
          {selectedMetric && metricValues && metricValues.values.length > 0 && (
            <div className="w-[140px] ml-auto">
              <label className="text-sm font-medium mb-2 block">Bins</label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="5"
                  max="5000"
                  value={binCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    if (!isNaN(value) && value >= 5 && value <= 5000) {
                      setBinCount(value)
                    }
                  }}
                  className="h-9"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 flex-shrink-0"
                  onClick={() => setBinCount(defaultBinCount)}
                  title="Reset to default"
                  disabled={binCount === defaultBinCount}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {!selectedMetric ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground border rounded-lg bg-muted/30">
            Please select a metric
          </div>
        ) : metricValues && metricValues.values.length > 0 ? (
          <div className="border rounded-lg p-4 bg-muted/30 relative">
            {loadingValues && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <Activity className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Loading histogram...</p>
                </div>
              </div>
            )}
            <HistogramChart
              values={metricValues.values}
              title={`${formatLabel(selectedCategory)} - ${formatLabel(selectedMetric)}`}
              xAxisLabel={formatLabel(selectedMetric)}
              yAxisLabel="Number of Annotations"
              binCount={binCount}
              color="#3b82f6"
              height={400}
              useLogScale={useLogScale}
            />
            {selectedMetric && (
              <p className="mt-3 text-sm text-muted-foreground text-center">
                {getMetricDescription(selectedMetric)}
              </p>
            )}
          </div>
        ) : loadingValues ? (
          <div className="flex items-center justify-center py-12 border rounded-lg bg-muted/30">
            <div className="text-center">
              <Activity className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Loading histogram...</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground border rounded-lg bg-muted/30">
            No data available for selected metric
          </div>
        )}
      </div>
    </div>
  )
}

