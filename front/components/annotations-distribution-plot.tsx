"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui"
import { getAnnotationsDistribution, type DistributionData, type DistributionParams } from "@/lib/api/annotations"
import dynamic from 'next/dynamic'
import { useUIStore } from "@/lib/stores/ui"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface AnnotationsDistributionPlotProps {
  params?: DistributionParams
  metric?: 'counts' | 'mean_lengths' | 'ratios'
  category?: 'coding_genes' | 'non_coding_genes' | 'pseudogenes' | 'all'
  plotType?: 'box' | 'violin'
  title?: string
  height?: number
}

export function AnnotationsDistributionPlot({
  params = {},
  metric = 'counts',
  category = 'all',
  plotType = 'box',
  title,
  height = 300,
}: AnnotationsDistributionPlotProps) {
  const [data, setData] = useState<DistributionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const theme = useUIStore((state) => state.theme)
  const isDark = theme === 'dark'

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const result = await getAnnotationsDistribution({
          ...params,
          metric,
          category,
        })
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load distribution data')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [JSON.stringify(params), metric, category])

  if (loading) {
    return (
      <Card className="p-4">
        {title && <h2 className="text-lg font-semibold mb-3">{title}</h2>}
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-xs text-muted-foreground">Loading chart...</p>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-4">
        {title && <h2 className="text-lg font-semibold mb-3">{title}</h2>}
        <div className="flex items-center justify-center text-sm text-destructive" style={{ height }}>
          Error: {error}
        </div>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="p-4">
        {title && <h2 className="text-lg font-semibold mb-3">{title}</h2>}
        <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
          No data available
        </div>
      </Card>
    )
  }

  // Get the data based on metric
  const metricData = data[metric]
  if (!metricData) {
    return (
      <Card className="p-4">
        {title && <h2 className="text-lg font-semibold mb-3">{title}</h2>}
        <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
          No {metric} data available
        </div>
      </Card>
    )
  }

  // Prepare chart data
  const categories = category === 'all' 
    ? ['coding_genes', 'non_coding_genes', 'pseudogenes'] as const
    : [category] as const

  const colors = {
    coding_genes: '#3b82f6', // blue
    non_coding_genes: '#10b981', // green
    pseudogenes: '#f59e0b', // amber
  }

  const categoryLabels = {
    coding_genes: 'Coding Genes',
    non_coding_genes: 'Non-coding Genes',
    pseudogenes: 'Pseudogenes',
  }

  // Type guard to safely access metricData
  const getCategoryValues = (cat: typeof categories[number]): number[] => {
    if (metric === 'ratios') {
      // For ratios, the structure is different
      const ratioData = metricData as DistributionData['ratios']
      if (cat === 'coding_genes') return ratioData?.coding_ratio || []
      if (cat === 'non_coding_genes') return ratioData?.non_coding_ratio || []
      if (cat === 'pseudogenes') return ratioData?.pseudogene_ratio || []
      return []
    } else {
      // For counts and mean_lengths, structure is the same
      const categoryData = metricData as DistributionData['counts'] | DistributionData['mean_lengths']
      return categoryData?.[cat] || []
    }
  }

  // Prepare plot data
  const plotData: Array<{
    y: number[]
    name: string
    type: 'box' | 'violin'
    boxpoints?: 'all' | 'outliers' | 'suspectedoutliers' | false
    fillcolor: string
    line: { color: string }
    marker?: { color: string }
  }> = []

  categories.forEach((cat) => {
    const values = getCategoryValues(cat)
    if (values.length > 0) {
      plotData.push({
        y: values,
        name: categoryLabels[cat],
        type: plotType === 'box' ? 'box' : 'violin',
        boxpoints: plotType === 'box' ? 'outliers' : false,
        fillcolor: colors[cat] + '40',
        line: { color: colors[cat] },
        marker: plotType === 'box' ? { color: colors[cat] } : undefined,
      })
    }
  })

  if (plotData.length === 0) {
    return (
      <Card className="p-4">
        {title && <h2 className="text-lg font-semibold mb-3">{title}</h2>}
        <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
          No data available for selected categories
        </div>
      </Card>
    )
  }

  // Plotly layout configuration
  const layout: any = {
    height: height,
    margin: { l: 50, r: 20, t: 20, b: 50 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: {
      color: isDark ? '#e5e7eb' : '#0f172a',
      size: 11,
    },
    xaxis: {
      title: {
        text: plotType === 'box' ? 'Category' : 'Category',
        font: { size: 12 },
      },
      showgrid: false,
      zeroline: false,
      color: isDark ? '#9ca3af' : '#64748b',
    },
    yaxis: {
      title: {
        text: metric.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        font: { size: 12 },
      },
      showgrid: true,
      gridcolor: isDark ? 'rgba(156, 163, 175, 0.1)' : 'rgba(100, 116, 139, 0.1)',
      zeroline: false,
      color: isDark ? '#9ca3af' : '#64748b',
    },
    showlegend: plotData.length > 1,
    legend: {
      orientation: 'h' as const,
      y: -0.2,
      x: 0.5,
      xanchor: 'center' as const,
      font: { size: 10 },
    },
    ...(plotData.length > 1 && plotType === 'box' ? { boxmode: 'group' as const } : {}),
    ...(plotData.length > 1 && plotType === 'violin' ? { violingroupgap: 0.1 } : {}),
  }

  const config = {
    displayModeBar: false,
    responsive: true,
  }

  return (
    <Card className="p-4">
      {title && <h2 className="text-lg font-semibold mb-1">{title}</h2>}
      <p className="text-xs text-muted-foreground mb-3">
        Distribution of {metric.replace('_', ' ')} across annotations
      </p>
      <div style={{ height }}>
        <Plot
          data={plotData}
          layout={layout}
          config={config}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </Card>
  )
}
