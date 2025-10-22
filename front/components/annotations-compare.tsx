"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { BarChart3, X, AlertCircle, ChevronDown } from "lucide-react"
import type { Annotation } from "@/lib/types"
import { getAnnotationsStatsSummary } from "@/lib/api/annotations"
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
)

interface AnnotationsCompareProps {
  favoriteAnnotations: Annotation[]
}

export function AnnotationsCompare({ favoriteAnnotations }: AnnotationsCompareProps) {
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([])
  const [comparisonStats, setComparisonStats] = useState<Record<string, any>>({})
  const [loadingStats, setLoadingStats] = useState<Record<string, boolean>>({})
  const MAX_COMPARISON = 10

  // Fetch stats for selected annotations
  useEffect(() => {
    async function fetchComparisonStats() {
      for (const annotationId of selectedForComparison) {
        if (comparisonStats[annotationId]) continue // Already have stats
        
        setLoadingStats(prev => ({ ...prev, [annotationId]: true }))
        try {
          const annotation = favoriteAnnotations.find(a => a.annotation_id === annotationId)
          if (annotation) {
            const stats = await getAnnotationsStatsSummary({ 
              md5_checksums: annotationId,
              taxids: annotation.taxid,
              assembly_accessions: annotation.assembly_accession
            })
            setComparisonStats(prev => ({ ...prev, [annotationId]: stats }))
          }
        } catch (error) {
          console.error(`Error fetching stats for ${annotationId}:`, error)
        } finally {
          setLoadingStats(prev => ({ ...prev, [annotationId]: false }))
        }
      }
    }
    
    if (selectedForComparison.length > 0) {
      fetchComparisonStats()
    }
  }, [selectedForComparison, favoriteAnnotations])

  const handleToggleAnnotation = (annotationId: string) => {
    setSelectedForComparison(prev => {
      if (prev.includes(annotationId)) {
        return prev.filter(id => id !== annotationId)
      } else {
        if (prev.length >= MAX_COMPARISON) {
          return prev
        }
        return [...prev, annotationId]
      }
    })
  }

  useEffect(() => {
    if (favoriteAnnotations.length > 0) {
      setSelectedForComparison(favoriteAnnotations.slice(0, MAX_COMPARISON).map(a => a.annotation_id))
    }
  }, [favoriteAnnotations])

  const handleClearSelection = () => {
    setSelectedForComparison([])
  }

  const selectedAnnotations = favoriteAnnotations.filter(a => 
    selectedForComparison.includes(a.annotation_id)
  )

  // Create mapping for organism names with duplicates
  const createOrganismLabelMap = (annotations: Annotation[]) => {
    const organismCounts: Record<string, number> = {}
    const labelMap: Record<string, string> = {}
    
    annotations.forEach(annotation => {
      const organismName = annotation.organism_name
      organismCounts[organismName] = (organismCounts[organismName] || 0) + 1
      
      if (organismCounts[organismName] === 1) {
        labelMap[annotation.annotation_id] = organismName
      } else {
        labelMap[annotation.annotation_id] = `${organismName} (${organismCounts[organismName]})`
      }
    })
    
    return labelMap
  }

  // Create label map for all favorite annotations (not just selected ones)
  const organismLabelMap = createOrganismLabelMap(favoriteAnnotations)

  return (
    <div className="space-y-6">
      {/* Selection Instructions */}
      <Card className="p-4 bg-blue-500/10 border-blue-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Compare Annotations</h3>
            <p className="text-sm text-muted-foreground">
              Select up to {MAX_COMPARISON} annotations from your favorites to compare their statistics.
              {selectedForComparison.length > 0 && (
                <span className="font-semibold text-foreground ml-1">
                  ({selectedForComparison.length}/{MAX_COMPARISON} selected)
                </span>
              )}
            </p>
          </div>
          {selectedForComparison.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Selection
            </Button>
          )}
        </div>
      </Card>

      {/* Annotation Selection List */}
      <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Available Annotations</h3>
        {favoriteAnnotations.length === 0 ? (
          <Card className="p-8 border-2 border-dashed">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 opacity-50 mx-auto mb-3" />
              <p className="text-sm">No favorite annotations available for comparison.</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteAnnotations.map((annotation) => {
              const isSelected = selectedForComparison.includes(annotation.annotation_id)
              const isDisabled = !isSelected && selectedForComparison.length >= MAX_COMPARISON

              return (
                <Card
                  key={annotation.annotation_id}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : isDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => !isDisabled && handleToggleAnnotation(annotation.annotation_id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() => !isDisabled && handleToggleAnnotation(annotation.annotation_id)}
                      className="mt-1"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1">
                            <span 
                              title={`This label will be used in the comparison charts to distinguish between multiple annotations from the same organism.`}
                              className="cursor-help"
                            >
                              {organismLabelMap[annotation.annotation_id]}
                            </span>
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {annotation.assembly_name} ({annotation.assembly_accession})
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {annotation.source_file_info.database}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Released: {new Date(annotation.source_file_info.release_date).toLocaleDateString()}</span>
                        {annotation.source_file_info.pipeline && (
                          <span>• Pipeline: {annotation.source_file_info.pipeline.name}</span>
                        )}
                        {annotation.source_file_info.provider && (
                          <span>• Provider: {annotation.source_file_info.provider}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Comparison Charts */}
      {selectedForComparison.length >= 2 && (
        <ComparisonChartsSection 
          selectedAnnotations={selectedAnnotations}
          comparisonStats={comparisonStats}
          loadingStats={loadingStats}
          organismLabelMap={organismLabelMap}
        />
      )}

      {/* Instructions when less than 2 selected */}
      {selectedForComparison.length < 2 && selectedForComparison.length > 0 && (
        <Card className="p-8 border-2 border-dashed">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 opacity-50 mx-auto mb-3" />
            <p className="text-sm">
              Select at least 2 annotations to view comparison charts.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

// Helper functions for overlap analysis
function findOverlappingItems(annotations: Annotation[], key: keyof Annotation['features_summary']): string[] {
  if (annotations.length === 0) return []
  
  // Get the first annotation's items as the base
  const firstItems = new Set(annotations[0].features_summary[key] as string[])
  
  // Find items that exist in all annotations
  const overlapping = Array.from(firstItems).filter(item => 
    annotations.every(ann => (ann.features_summary[key] as string[]).includes(item))
  )
  
  return overlapping.sort()
}

function findOverlappingRootTypes(annotations: Annotation[]): string[] {
  if (annotations.length === 0) return []
  
  const firstKeys = new Set(Object.keys(annotations[0].features_summary.root_type_counts))
  
  const overlapping = Array.from(firstKeys).filter(key => 
    annotations.every(ann => key in ann.features_summary.root_type_counts)
  )
  
  return overlapping.sort()
}

// Comparison Charts Section Component
function ComparisonChartsSection({ 
  selectedAnnotations,
  loadingStats,
  organismLabelMap
}: {
  selectedAnnotations: Annotation[]
  comparisonStats: Record<string, any>
  loadingStats: Record<string, boolean>
  organismLabelMap: Record<string, string>
}) {
  const isLoading = selectedAnnotations.some(ann => loadingStats[ann.annotation_id])

  // Find overlapping GFF structure elements
  const overlappingBiotypes = findOverlappingItems(selectedAnnotations, 'biotypes')
  const overlappingFeatureTypes = findOverlappingItems(selectedAnnotations, 'types')
  const overlappingRootTypes = findOverlappingRootTypes(selectedAnnotations)
  const overlappingAttributeKeys = findOverlappingItems(selectedAnnotations, 'attribute_keys')

  // Extract gene counts and length stats for each annotation
  const geneData = selectedAnnotations.map(ann => {    
    // Fallback to annotation's own features_statistics if API stats are not available
    const featuresStatistics = ann.features_statistics
    
    // Try multiple possible data structures
    let codingGenes = featuresStatistics?.coding_genes
    let nonCodingGenes = featuresStatistics?.non_coding_genes
    let pseudogenes = featuresStatistics?.pseudogenes
    
    return {
      annotation: ann,
      codingGenes,
      nonCodingGenes,
      pseudogenes,
    }
  })

  const transcriptData = selectedAnnotations.map(ann => {
    const featuresStatistics = ann.features_statistics
    let codingTranscriptsTypes = featuresStatistics?.coding_genes?.transcripts?.types
    let nonCodingTranscriptsTypes = featuresStatistics?.non_coding_genes?.transcripts?.types
    let pseudogenesTranscriptsTypes = featuresStatistics?.pseudogenes?.transcripts?.types
    return {
      annotation: ann,
      codingTranscriptsTypes,
      nonCodingTranscriptsTypes,
      pseudogenesTranscriptsTypes,
    }
  })

  // Check if any annotation has each gene type
  const hasCodingGenes = geneData.some(d => d.codingGenes !== null)
  const hasNonCodingGenes = geneData.some(d => d.nonCodingGenes !== null)
  const hasPseudogenes = geneData.some(d => d.pseudogenes !== null)

  const [isGffSectionOpen, setIsGffSectionOpen] = useState(false)

  return (
    <div className="space-y-6">
      {isLoading && (
        <Card className="p-6 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-blue-500 animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading statistics...</p>
          </div>
        </Card>
      )}

      {/* GFF Structure Section - Collapsible */}
      <Collapsible open={isGffSectionOpen} onOpenChange={setIsGffSectionOpen}>
        <Card className="p-5">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
              <h4 className="text-lg font-semibold text-foreground">GFF Structure Overlap</h4>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isGffSectionOpen ? 'transform rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OverlapCard
                title="Common Biotypes"
                items={overlappingBiotypes}
                totalAnnotations={selectedAnnotations.length}
              />
              <OverlapCard
                title="Common Feature Types"
                items={overlappingFeatureTypes}
                totalAnnotations={selectedAnnotations.length}
              />
              <OverlapCard
                title="Common Root Types"
                items={overlappingRootTypes}
                totalAnnotations={selectedAnnotations.length}
              />
              <OverlapCard
                title="Common Attribute Keys"
                items={overlappingAttributeKeys}
                totalAnnotations={selectedAnnotations.length}
              />
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Gene Categories Comparison */}
      {!isLoading && (hasCodingGenes || hasNonCodingGenes || hasPseudogenes) && (
        <div className="space-y-6">
          <GroupedGeneComparisonChart
            geneData={geneData}
            hasCodingGenes={hasCodingGenes}
            hasNonCodingGenes={hasNonCodingGenes}
            hasPseudogenes={hasPseudogenes}
            organismLabelMap={organismLabelMap}
          />
          <div/>

          <div className="space-y-6" />

          <TranscriptTypeStackedBarChart
            transcriptData={transcriptData}
            hasCodingGenes={hasCodingGenes}
            hasNonCodingGenes={hasNonCodingGenes}
            hasPseudogenes={hasPseudogenes}
            organismLabelMap={organismLabelMap}
          />
          <div/>
          <div className="space-y-6" />

          <TranscriptTypeHeatmap
            transcriptData={transcriptData}
            hasCodingGenes={hasCodingGenes}
            hasNonCodingGenes={hasNonCodingGenes}
            hasPseudogenes={hasPseudogenes}
            organismLabelMap={organismLabelMap}
          />
        </div>
      )}
    </div>
  )
}

// Overlap Card Component
function OverlapCard({ 
  title, 
  items, 
  totalAnnotations 
}: { 
  title: string
  items: string[]
  totalAnnotations: number
}) {
  const [expanded, setExpanded] = useState(false)
  const displayItems = expanded ? items : items.slice(0, 10)
  const hasMore = items.length > 10

  return (
    <Card className="p-4 bg-muted/30">
      <div className="mb-3">
        <h5 className="font-semibold text-foreground mb-1">{title}</h5>
        <p className="text-xs text-muted-foreground">
          {items.length} item{items.length !== 1 ? 's' : ''} present in all {totalAnnotations} annotation{totalAnnotations !== 1 ? 's' : ''}
        </p>
      </div>
      
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground italic py-2">
          No common items found
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {displayItems.map((item, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
          
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="mt-3 h-7 text-xs"
            >
              {expanded ? 'Show Less' : `Show ${items.length - 10} More`}
            </Button>
          )}
        </>
      )}
    </Card>
  )
}

// Grouped Gene Comparison Chart Component (Count or Length)
function GroupedGeneComparisonChart({ 
  geneData,
  hasCodingGenes,
  hasNonCodingGenes,
  hasPseudogenes,
  organismLabelMap
}: { 
  geneData: any[]
  hasCodingGenes: boolean
  hasNonCodingGenes: boolean
  hasPseudogenes: boolean
  organismLabelMap: Record<string, string>
}) {
  const [metricType, setMetricType] = useState<'count' | 'mean_length' | 'median_length'>('count')
  
  // X-axis: Gene categories
  const labels = []
  if (hasCodingGenes) labels.push('Coding Genes')
  if (hasPseudogenes) labels.push('Pseudogenes')
  if (hasNonCodingGenes) labels.push('Non-coding Genes')
  
  // Create datasets for each annotation
  const colors = [
    '#3b82f6', // blue-500
    '#f97316', // orange-500
    '#a855f7', // purple-500
    '#10b981', // green-500
    '#ef4444', // red-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#6366f1', // indigo-500
    '#ec4899', // pink-500
    '#f59e0b', // amber-500
    '#94a3b8', // slate-500
  ]
  
  const datasets = geneData.map((data, idx) => {
    const dataPoints = []
    
    if (metricType === 'count') {
      if (hasCodingGenes) dataPoints.push(data.codingGenes?.count || 0)
      if (hasPseudogenes) dataPoints.push(data.pseudogenes?.count || 0)
      if (hasNonCodingGenes) dataPoints.push(data.nonCodingGenes?.count || 0)
    } 
  
    else if (metricType === 'mean_length') {
      if (hasCodingGenes) {
        const lengthStats = data.codingGenes?.length_stats
        dataPoints.push(lengthStats?.mean || 0)
      }
      if (hasPseudogenes) {
        const lengthStats = data.pseudogenes?.length_stats
        dataPoints.push(lengthStats?.mean || 0)
      }
      if (hasNonCodingGenes) {
        const lengthStats = data.nonCodingGenes?.length_stats
        dataPoints.push(lengthStats?.mean || 0)
      }
    }

    else {
      if (hasCodingGenes) {
        const lengthStats = data.codingGenes?.length_stats
        dataPoints.push(lengthStats?.median || 0)
      }
      if (hasPseudogenes) {
        const lengthStats = data.pseudogenes?.length_stats
        dataPoints.push(lengthStats?.median || 0)
      }
      if (hasNonCodingGenes) {
        const lengthStats = data.nonCodingGenes?.length_stats
        dataPoints.push(lengthStats?.median || 0)
      }
    }
    
    return {
      label: organismLabelMap[data.annotation.annotation_id],
      data: dataPoints,
      backgroundColor: colors[idx % colors.length],
      borderColor: colors[idx % colors.length],
      borderWidth: 1,
    }
  })

  const chartData = {
    labels,
    datasets,
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: '#64748b',
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y.toLocaleString()
            const suffix = metricType === 'count' ? '' : ' bp'
            return `${context.dataset.label}: ${value}${suffix}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12,
          },
          callback: function(value: any) {
            return value.toLocaleString()
          },
        },
      },
    },
  }

  return (
    <Card className="p-6 mb-4">
      <div className="mb-4">
        <h4 className="font-semibold text-lg text-foreground mb-2">
          Gene Category Comparison
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Compare gene metrics across different categories. Select a metric to visualize and click on legend items to filter specific annotations.
        </p>
        <Select value={metricType} onValueChange={(value: any) => setMetricType(value)}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="count">Gene Count</SelectItem>
            <SelectItem value="mean_length">Mean Length</SelectItem>
            <SelectItem value="median_length">Median Length</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="h-[400px]">
        <Bar data={chartData} options={options} />
      </div>
    </Card>
  )
}

// Transcript Type Stacked Bar Chart Component
function TranscriptTypeStackedBarChart({ 
  transcriptData,
  hasCodingGenes,
  hasNonCodingGenes,
  hasPseudogenes,
  organismLabelMap
}: { 
  transcriptData: any[]
  hasCodingGenes: boolean
  hasNonCodingGenes: boolean
  hasPseudogenes: boolean
  organismLabelMap: Record<string, string>
}) {
  const getInitialCategory = () => {
    if (hasCodingGenes) return 'coding'
    if (hasPseudogenes) return 'pseudogenes'
    if (hasNonCodingGenes) return 'nonCoding'
    return 'coding'
  }

  const [geneCategory, setGeneCategory] = useState<'coding' | 'pseudogenes' | 'nonCoding'>(getInitialCategory())
  
  const geneKeyMap = {
    coding: 'codingTranscriptsTypes',
    pseudogenes: 'pseudogenesTranscriptsTypes',
    nonCoding: 'nonCodingTranscriptsTypes',
  } as const
  
  const geneKey = geneKeyMap[geneCategory]
  
  // Extract all unique transcript types
  const transcriptTypesSet = new Set<string>()
  transcriptData.forEach(data => {
    const typeData = data[geneKey]
    if (typeData) {
      Object.keys(typeData).forEach(type => transcriptTypesSet.add(type))
    }
  })
  const types = Array.from(transcriptTypesSet).sort()
  
  if (types.length === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          {hasCodingGenes && (
            <Button variant={geneCategory === 'coding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('coding')} className="h-8 text-xs">Coding Genes</Button>
          )}
          {hasPseudogenes && (
            <Button variant={geneCategory === 'pseudogenes' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('pseudogenes')} className="h-8 text-xs">Pseudogenes</Button>
          )}
          {hasNonCodingGenes && (
            <Button variant={geneCategory === 'nonCoding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('nonCoding')} className="h-8 text-xs">Non-coding Genes</Button>
          )}
        </div>
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-sm text-muted-foreground italic">No transcript type data available</p>
        </div>
      </Card>
    )
  }

  // Generate colors for transcript types
  const typeColors = [
    '#3b82f6', '#f97316', '#a855f7', '#10b981', '#ef4444',
    '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6',
    '#6366f1', '#f43f5e', '#84cc16', '#0ea5e9', '#f59e0b',
  ]

  // Prepare stacked bar data
  const labels = transcriptData.map(data => organismLabelMap[data.annotation.annotation_id])
  
  const datasets = types.map((type, idx) => ({
    label: type,
    data: transcriptData.map(data => data[geneKey]?.[type]?.count || 0),
    backgroundColor: typeColors[idx % typeColors.length],
    borderColor: typeColors[idx % typeColors.length],
    borderWidth: 1,
  }))

  const chartData = { labels, datasets }

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right' as const,
        labels: {
          color: '#64748b',
          font: { size: 10 },
          boxWidth: 12,
          padding: 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.x.toLocaleString()} transcripts`
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          color: '#64748b',
          font: { size: 10 },
          callback: function(value: any) {
            return value.toLocaleString()
          },
        },
        grid: {
          display: true,
          color: '#e2e8f0',
        },
      },
      y: {
        stacked: true,
        ticks: {
          color: '#64748b',
          font: { size: 11 },
        },
        grid: {
          display: false,
        },
      },
    },
  }

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h4 className="font-semibold text-lg text-foreground mb-2">Transcript Type Distribution - Stacked View</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Compare the total transcript count and composition across annotations. Each bar shows the relative proportion of different transcript types.
        </p>
        <div className="flex items-center gap-2">
          {hasCodingGenes && (
            <Button variant={geneCategory === 'coding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('coding')} className="h-8 text-xs">Coding Genes</Button>
          )}
          {hasPseudogenes && (
            <Button variant={geneCategory === 'pseudogenes' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('pseudogenes')} className="h-8 text-xs">Pseudogenes</Button>
          )}
          {hasNonCodingGenes && (
            <Button variant={geneCategory === 'nonCoding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('nonCoding')} className="h-8 text-xs">Non-coding Genes</Button>
          )}
        </div>
      </div>
      <div className="h-[400px]">
        <Bar data={chartData} options={options} />
      </div>
    </Card>
  )
}

// Transcript Type Heatmap Component
function TranscriptTypeHeatmap({ 
  transcriptData,
  hasCodingGenes,
  hasNonCodingGenes,
  hasPseudogenes,
  organismLabelMap
}: { 
  transcriptData: any[]
  hasCodingGenes: boolean
  hasNonCodingGenes: boolean
  hasPseudogenes: boolean
  organismLabelMap: Record<string, string>
}) {
  const getInitialCategory = () => {
    if (hasCodingGenes) return 'coding'
    if (hasPseudogenes) return 'pseudogenes'
    if (hasNonCodingGenes) return 'nonCoding'
    return 'coding'
  }

  const [geneCategory, setGeneCategory] = useState<'coding' | 'pseudogenes' | 'nonCoding'>(getInitialCategory())
  const [metricField, setMetricField] = useState<'count' | 'mean_length' | 'per_gene' | 'median_length' | 'exons_per_transcript' | 'spliced_mean_length' | 'spliced_median_length' | 'exon_mean_length' | 'exon_median_length'>('count')
  
  const geneKeyMap = {
    coding: 'codingTranscriptsTypes',
    pseudogenes: 'pseudogenesTranscriptsTypes',
    nonCoding: 'nonCodingTranscriptsTypes',
  } as const
  
  const geneKey = geneKeyMap[geneCategory]
  
  // Extract all unique transcript types
  const transcriptTypesSet = new Set<string>()
  transcriptData.forEach(data => {
    const typeData = data[geneKey]
    if (typeData) {
      Object.keys(typeData).forEach(type => transcriptTypesSet.add(type))
    }
  })
  const types = Array.from(transcriptTypesSet).sort()
  
  if (types.length === 0) {
    return (
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {hasCodingGenes && <Button variant={geneCategory === 'coding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('coding')} className="h-8 text-xs">Coding Genes</Button>}
            {hasPseudogenes && <Button variant={geneCategory === 'pseudogenes' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('pseudogenes')} className="h-8 text-xs">Pseudogenes</Button>}
            {hasNonCodingGenes && <Button variant={geneCategory === 'nonCoding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('nonCoding')} className="h-8 text-xs">Non-coding Genes</Button>}
          </div>
          <Select value={metricField} onValueChange={(value: any) => setMetricField(value)}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="mean_length">Mean Length</SelectItem>
              <SelectItem value="per_gene">Per Gene</SelectItem>
              <SelectItem value="median_length">Median Length</SelectItem>
              <SelectItem value="exons_per_transcript">Exons per Transcript</SelectItem>
              <SelectItem value="spliced_mean_length">Spliced Mean Length</SelectItem>
              <SelectItem value="spliced_median_length">Spliced Median Length</SelectItem>
              <SelectItem value="exon_mean_length">Exon Mean Length</SelectItem>
              <SelectItem value="exon_median_length">Exon Median Length</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-sm text-muted-foreground italic">No transcript type data available</p>
        </div>
      </Card>
    )
  }

  // Calculate max value for color scaling
  const allValues: number[] = []
  transcriptData.forEach(data => {
    types.forEach(type => {
      const typeData = data[geneKey]?.[type]
      if (typeData) {
        if (metricField === 'count') allValues.push(typeData.count || 0)
        else if (metricField === 'mean_length') allValues.push(typeData.length_stats?.mean || 0)
        else if (metricField === 'per_gene') allValues.push(typeData.per_gene || 0)
        else if (metricField === 'median_length') allValues.push(typeData.length_stats?.median || 0)
        else if (metricField === 'exons_per_transcript') allValues.push(typeData.exons_per_transcript || 0)
        else if (metricField === 'spliced_mean_length') allValues.push(typeData.spliced_length_stats?.mean || 0)
        else if (metricField === 'spliced_median_length') allValues.push(typeData.spliced_length_stats?.median || 0)
        else if (metricField === 'exon_mean_length') allValues.push(typeData.exon_length_stats?.mean || 0)
        else if (metricField === 'exon_median_length') allValues.push(typeData.exon_length_stats?.median || 0)
      }
    })
  })
  const maxValue = Math.max(...allValues, 1)

  // Helper to get color based on value - using blue palette consistent with app theme
  const getHeatmapColor = (value: number) => {
    const intensity = value / maxValue
    
    // Color palette from light blue to dark blue
    // Light: #dbeafe (blue-100) -> Dark: #1e40af (blue-800)
    const r = Math.floor(219 + intensity * (30 - 219))
    const g = Math.floor(234 + intensity * (64 - 234))
    const b = Math.floor(254 + intensity * (175 - 254))
    
    return `rgb(${r}, ${g}, ${b})`
  }

  return (
    <Card className="p-5">
      <div className="mb-4">
        <h4 className="font-semibold text-lg text-foreground mb-2">Transcript Type Distribution - Detailed Heatmap</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Detailed matrix view of transcript types across annotations. Color intensity represents the selected metric value. Switch metrics to explore different aspects of the data.
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasCodingGenes && <Button variant={geneCategory === 'coding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('coding')} className="h-8 text-xs">Coding Genes</Button>}
            {hasPseudogenes && <Button variant={geneCategory === 'pseudogenes' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('pseudogenes')} className="h-8 text-xs">Pseudogenes</Button>}
            {hasNonCodingGenes && <Button variant={geneCategory === 'nonCoding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('nonCoding')} className="h-8 text-xs">Non-coding Genes</Button>}
          </div>
          <Select value={metricField} onValueChange={(value: any) => setMetricField(value)}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="mean_length">Mean Length</SelectItem>
              <SelectItem value="per_gene">Per Gene</SelectItem>
              <SelectItem value="median_length">Median Length</SelectItem>
              <SelectItem value="exons_per_transcript">Exons per Transcript</SelectItem>
              <SelectItem value="spliced_mean_length">Spliced Mean Length</SelectItem>
              <SelectItem value="spliced_median_length">Spliced Median Length</SelectItem>
              <SelectItem value="exon_mean_length">Exon Mean Length</SelectItem>
              <SelectItem value="exon_median_length">Exon Median Length</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-auto max-h-[500px] border border-border rounded-md">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="h-[50px]">
              <th className="border border-border p-2 text-left font-semibold bg-muted sticky left-0 z-20">Annotation</th>
              {types.map(type => (
                <th key={type} className="border border-border p-2 font-semibold bg-muted">
                  {type}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transcriptData.map((data, idx) => {
              const annotationLabel = organismLabelMap[data.annotation.annotation_id]
              return (
                <tr key={idx}>
                  <td className="border border-border p-2 font-medium bg-muted sticky left-0 z-10">{annotationLabel}</td>
                  {types.map(type => {
                    const typeData = data[geneKey]?.[type]
                    let value = 0
                    let displayValue = '-'
                    
                    if (typeData) {
                      if (metricField === 'count') {
                        value = typeData.count || 0
                        displayValue = value > 0 ? value.toLocaleString() : '-'
                      } else if (metricField === 'mean_length') {
                        value = typeData.length_stats?.mean || 0
                        displayValue = value > 0 ? value.toLocaleString() : '-'
                      } else if (metricField === 'per_gene') {
                        value = typeData.per_gene || 0
                        displayValue = value > 0 ? value.toFixed(2) : '-'
                      } else if (metricField === 'median_length') {
                        value = typeData.length_stats?.median || 0
                        displayValue = value > 0 ? value.toLocaleString() : '-'
                      } else if (metricField === 'exons_per_transcript') {
                        value = typeData.exons_per_transcript || 0
                        displayValue = value > 0 ? value.toLocaleString() : '-'
                      } else if (metricField === 'spliced_mean_length') {
                        value = typeData.spliced_length_stats?.mean || typeData.exon_length_stats?.mean || 0
                        displayValue = value > 0 ? value.toLocaleString() : '-'
                      } else if (metricField === 'spliced_median_length') {
                        value = typeData.spliced_length_stats?.median || typeData.exon_length_stats?.median || 0
                        displayValue = value > 0 ? value.toLocaleString() : '-'
                      } else if (metricField === 'exon_mean_length') {
                        value = typeData.exon_length_stats?.mean || 0
                        displayValue = value > 0 ? value.toLocaleString() : '-'
                      } else if (metricField === 'exon_median_length') {
                        value = typeData.exon_length_stats?.median || 0
                        displayValue = value > 0 ? value.toLocaleString() : '-'
                      }
                    }
                    
                    const bgColor = value > 0 ? getHeatmapColor(value) : 'transparent'
                    const textColor = value > maxValue * 0.5 ? '#ffffff' : '#1e293b'
                    
                    return (
                      <td 
                        key={type}
                        className="border border-border p-2 text-center"
                        style={{ backgroundColor: bgColor, color: textColor }}
                        title={`${annotationLabel} - ${type}: ${displayValue}`}
                      >
                        {displayValue}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
