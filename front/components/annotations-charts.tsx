"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { Database, Code, Workflow, Tag, Layers, FileType, Loader2 } from "lucide-react"
import { getAnnotationsFrequencies } from "@/lib/api/annotations"

interface FrequencyData {
  name: string
  value: number
  percentage?: number
}

interface ChartCardProps {
  title: string
  description: string
  field: string
  icon: React.ElementType
  color: string
  chartType?: "bar" | "pie"
  filterParams?: Record<string, any>
}

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#6366f1", // indigo
]

function ChartCard({ title, description, field, icon: Icon, color, chartType = "bar", filterParams }: ChartCardProps) {
  const [data, setData] = useState<FrequencyData[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoaded) {
            setIsVisible(true)
          }
        })
      },
      { threshold: 0.1, rootMargin: "50px" }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current)
      }
    }
  }, [hasLoaded])

  // Fetch data when visible
  useEffect(() => {
    if (isVisible && !hasLoaded) {
      fetchData()
    }
  }, [isVisible, hasLoaded])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await getAnnotationsFrequencies(field, filterParams)
      
      // Transform data for charts
      const transformedData = Object.entries(response)
        .map(([name, value]) => ({
          name: name || "Unknown",
          value: value as number,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15) // Limit to top 15 items to prevent overlap

      // Calculate percentages for pie chart
      if (chartType === "pie") {
        const total = transformedData.reduce((sum, item) => sum + item.value, 0)
        transformedData.forEach(item => {
          (item as any).percentage = (item.value / total) * 100
        })
      }

      setData(transformedData)
      setHasLoaded(true)
    } catch (error) {
      console.error(`Error fetching ${field}:`, error)
      setData([])
      setHasLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading chart...</p>
          </div>
        </div>
      )
    }

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>No data available</p>
        </div>
      )
    }

    if (chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage?.toFixed(1)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => value.toLocaleString()}
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={80}
            tick={{ fontSize: 9 }}
            stroke="hsl(var(--muted-foreground))"
            interval={0}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip 
            formatter={(value: number) => value.toLocaleString()}
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <Card ref={cardRef} className="p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {renderChart()}
      {data.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Showing {data.length} {data.length === 15 ? "(top 15)" : ""} entries • Total: {data.reduce((sum, item) => sum + item.value, 0).toLocaleString()} annotations
          </p>
        </div>
      )}
    </Card>
  )
}

interface AnnotationsChartsProps {
  filterParams?: Record<string, any>
}

export function AnnotationsCharts({ filterParams }: AnnotationsChartsProps) {
  return (
    <div className="max-w-7xl mx-auto mt-12 mb-16 px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-3">Annotation Statistics & Distribution</h2>
        <p className="text-muted-foreground text-lg">
          Explore frequency distributions across different annotation attributes
        </p>
      </div>

      <div className="space-y-8">
        {/* Database Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Database Sources"
            description="Distribution of annotations by source database"
            field="database"
            icon={Database}
            color="#3b82f6"
            chartType="pie"
            filterParams={filterParams}
          />
          <ChartCard
            title="Annotation Providers"
            description="Organizations providing annotation data"
            field="provider"
            icon={Code}
            color="#10b981"
            chartType="bar"
            filterParams={filterParams}
          />
        </div>

        {/* Pipeline */}
        <ChartCard
          title="Annotation Pipelines"
          description="Computational pipelines used for generating annotations"
          field="pipeline"
          icon={Workflow}
          color="#f59e0b"
          chartType="bar"
          filterParams={filterParams}
        />

        {/* Feature Summary - Row of 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartCard
            title="Biotypes"
            description="Biological types of annotated features"
            field="biotype"
            icon={Tag}
            color="#8b5cf6"
            chartType="bar"
            filterParams={filterParams}
          />
          <ChartCard
            title="Feature Sources"
            description="Sources of feature annotations (2nd GFF column)"
            field="feature_source"
            icon={Layers}
            color="#ec4899"
            chartType="bar"
            filterParams={filterParams}
          />
          <ChartCard
            title="Feature Types"
            description="Types of genomic features (3rd GFF column)"
            field="feature_type"
            icon={FileType}
            color="#06b6d4"
            chartType="bar"
            filterParams={filterParams}
          />
        </div>
      </div>

      {/* Info card */}
      <Card className="mt-8 p-6 bg-muted/30 border-dashed">
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Lazy Loading:</strong> Charts load automatically as you scroll to improve performance and reduce server load.
            </p>
            <p>
              <strong className="text-foreground">Data Source:</strong> All statistics are computed from GFF3 annotation files and aggregated across the entire database.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

