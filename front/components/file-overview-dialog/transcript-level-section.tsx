"use client"

import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bar } from 'react-chartjs-2'
import { useState } from "react"
import { Code, Layers, Workflow } from "lucide-react"
import {
  GENE_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  createLegendConfig,
  createTooltipConfig,
  createBarChartOptions,
  getFilteredTranscriptTypes,
  createCategoryDatasets,
  type GeneCategory,
} from '../file-overview-dialog-helpers'

const CATEGORY_CONFIG = {
  coding_genes: {
    icon: Code,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    borderClass: 'border-primary',
  },
  non_coding_genes: {
    icon: Layers,
    colorClass: 'text-secondary',
    bgClass: 'bg-secondary/10',
    borderClass: 'border-secondary',
  },
  pseudogenes: {
    icon: Workflow,
    colorClass: 'text-accent',
    bgClass: 'bg-accent/10',
    borderClass: 'border-accent',
  },
}

interface TranscriptLevelSectionProps {
  stats: any
  allTranscriptTypes: string[]
  selectedCategories: Set<GeneCategory>
  selectedTranscriptTypes: Set<string>
  onCategoryToggle: (category: GeneCategory) => void
  onTranscriptTypeToggle: (type: string) => void
  transcriptStatsView: 'mean_length' | 'exons_per_transcript'
  onTranscriptStatsViewChange: (view: 'mean_length' | 'exons_per_transcript') => void
}

export function TranscriptLevelSection({
  stats,
  allTranscriptTypes,
  selectedCategories,
  selectedTranscriptTypes,
  onCategoryToggle,
  onTranscriptTypeToggle,
  transcriptStatsView,
  onTranscriptStatsViewChange,
}: TranscriptLevelSectionProps) {
  const legendConfig = createLegendConfig({
    onCategoryToggle,
    categoryKeys: GENE_CATEGORIES,
    stats,
  })

  const [showAllTranscripts, setShowAllTranscripts] = useState(false)
  const [selectedTranscriptType, setSelectedTranscriptType] = useState<string | null>(null)

  if (allTranscriptTypes.length === 0) return null

  // Aggregate transcript type counts across all categories
  const transcriptTypeData = allTranscriptTypes.map(type => {
    let totalCount = 0
    const categoryCounts: Record<GeneCategory, number> = {
      coding_genes: 0,
      non_coding_genes: 0,
      pseudogenes: 0,
    }
    
    // Collect all stats from all categories
    const allTypeData: any[] = []
    
    GENE_CATEGORIES.forEach(cat => {
      const typeData = stats[cat]?.transcripts?.types?.[type]
      if (typeData) {
        const count = typeData.count || 0
        categoryCounts[cat] = count
        totalCount += count
        if (count > 0) {
          allTypeData.push({ ...typeData, count })
        }
      }
    })

    // Aggregate stats (weighted by count)
    const aggregatedStats: any = {
      count: totalCount,
      per_gene: 0,
      exons_per_transcript: 0,
      length_stats: { mean: 0, median: 0 },
      spliced_length_stats: { mean: 0, median: 0 },
      exon_length_stats: { mean: 0, median: 0 },
    }

    if (totalCount > 0 && allTypeData.length > 0) {
      // Weighted averages
      let weightedPerGene = 0
      let weightedExonsPerTranscript = 0
      let weightedLengthMean = 0
      let weightedLengthMedian = 0
      let weightedSplicedMean = 0
      let weightedSplicedMedian = 0
      let weightedExonMean = 0
      let weightedExonMedian = 0

      allTypeData.forEach(data => {
        const weight = data.count / totalCount
        if (data.per_gene) weightedPerGene += data.per_gene * weight
        if (data.exons_per_transcript) weightedExonsPerTranscript += data.exons_per_transcript * weight
        if (data.length_stats?.mean) weightedLengthMean += data.length_stats.mean * weight
        if (data.length_stats?.median) weightedLengthMedian += data.length_stats.median * weight
        if (data.spliced_length_stats?.mean) weightedSplicedMean += data.spliced_length_stats.mean * weight
        if (data.spliced_length_stats?.median) weightedSplicedMedian += data.spliced_length_stats.median * weight
        if (data.exon_length_stats?.mean) weightedExonMean += data.exon_length_stats.mean * weight
        if (data.exon_length_stats?.median) weightedExonMedian += data.exon_length_stats.median * weight
      })

      aggregatedStats.per_gene = weightedPerGene
      aggregatedStats.exons_per_transcript = weightedExonsPerTranscript
      aggregatedStats.length_stats = {
        mean: weightedLengthMean || undefined,
        median: weightedLengthMedian || undefined,
      }
      aggregatedStats.spliced_length_stats = {
        mean: weightedSplicedMean || undefined,
        median: weightedSplicedMedian || undefined,
      }
      aggregatedStats.exon_length_stats = {
        mean: weightedExonMean || undefined,
        median: weightedExonMedian || undefined,
      }
    }

    return {
      type,
      totalCount,
      categoryCounts,
      stats: aggregatedStats,
    }
  })

  // Sort by total count and get top 10
  const sortedTranscriptTypes = transcriptTypeData
    .sort((a, b) => b.totalCount - a.totalCount)
  
  const displayedTranscriptTypes = showAllTranscripts 
    ? sortedTranscriptTypes 
    : sortedTranscriptTypes.slice(0, 10)

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-2">Transcript-Level Analysis</h4>
        <p className="text-xs text-muted-foreground mb-1">Visualize transcript diversity and structure</p>
        <p className="text-xs text-muted-foreground italic">Click on legend items to show/hide categories in the charts</p>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Transcript Types:</span>
            {allTranscriptTypes.slice(0, 15).map(type => (
              <div key={type} className="flex items-center gap-1">
                <Checkbox
                  checked={selectedTranscriptTypes.size === 0 || selectedTranscriptTypes.has(type)}
                  onCheckedChange={() => onTranscriptTypeToggle(type)}
                  id={`transcript-${type}`}
                />
                <label htmlFor={`transcript-${type}`} className="text-xs cursor-pointer">
                  {type}
                </label>
              </div>
            ))}
            {allTranscriptTypes.length > 15 && (
              <span className="text-xs text-muted-foreground">+{allTranscriptTypes.length - 15} more</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Stacked bar: Transcript counts per gene category */}
        <div>
          <h5 className="text-xs font-medium mb-4">Transcript Counts per Gene Category</h5>
          
          <div className="space-y-3">
            {displayedTranscriptTypes.map(({ type, totalCount, categoryCounts }) => {
              const isSelected = selectedTranscriptType === type
              
              // Calculate segment positions (each bar shows 100% of that transcript type)
              let cumulativePosition = 0
              const segments = GENE_CATEGORIES
                .filter(cat => categoryCounts[cat] > 0)
                .map(cat => {
                  const count = categoryCounts[cat]
                  const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0
                  const position = cumulativePosition
                  cumulativePosition += percentage
                  return {
                    cat,
                    count,
                    percentage,
                    position,
                    width: percentage,
                  }
                })

              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedTranscriptType(isSelected ? null : type)}
                        className="text-sm font-medium hover:opacity-80 transition-opacity"
                      >
                        {type}
                      </button>
                      <div className="flex items-center gap-1.5 text-xs">
                        {segments.map(({ cat, percentage }) => {
                          const config = CATEGORY_CONFIG[cat]
                          return (
                            <span
                              key={cat}
                              className={config.colorClass}
                              title={`${CATEGORY_LABELS[cat]}: ${percentage.toFixed(2)}%`}
                            >
                              {percentage.toFixed(2)}%
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono font-semibold">
                        {totalCount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Stacked Bar */}
                  <div
                    onClick={() => setSelectedTranscriptType(isSelected ? null : type)}
                    className="relative h-8 rounded-lg overflow-hidden bg-muted border cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {segments.map(({ cat, count, percentage, position, width }) => {
                      const config = CATEGORY_CONFIG[cat]
                      return (
                        <div
                          key={cat}
                          className={`absolute h-full transition-all duration-300 ${config.bgClass} ${config.borderClass} border-r last:border-r-0 flex items-center justify-end pr-2`}
                          style={{
                            left: `${position}%`,
                            width: `${width}%`,
                          }}
                          title={`${CATEGORY_LABELS[cat]}: ${count.toLocaleString()} (${percentage.toFixed(2)}%)`}
                        >
                          {width > 8 && (
                            <span className={`text-xs font-semibold ${config.colorClass} whitespace-nowrap`}>
                              {count.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Stats Card - Displayed immediately under selected bar */}
                  {isSelected && (
                    <Card className="p-4 bg-muted/30 border-2 mt-2">
                      <div className="flex items-center justify-between mb-4">
                        <h6 className="text-sm font-semibold">{type} Statistics</h6>
                        <button
                          onClick={() => setSelectedTranscriptType(null)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Close
                        </button>
                      </div>
                      
                      {/* Stats by Category */}
                      <div className="space-y-4">
                        <p className="text-xs font-medium text-muted-foreground">By Gene Category</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {GENE_CATEGORIES.map(cat => {
                            const typeData = stats[cat]?.transcripts?.types?.[type]
                            if (!typeData || !typeData.count) return null
                            
                            const config = CATEGORY_CONFIG[cat]
                            const Icon = config.icon
                            
                            return (
                              <div
                                key={cat}
                                className={`rounded-lg p-3 border-2 ${config.bgClass} ${config.borderClass}`}
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <Icon className={`h-4 w-4 ${config.colorClass}`} />
                                  <h6 className={`text-xs font-semibold ${config.colorClass}`}>
                                    {CATEGORY_LABELS[cat]}
                                  </h6>
                                </div>
                                
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Count:</span>
                                    <span className="font-mono font-semibold">
                                      {typeData.count?.toLocaleString() || '0'}
                                    </span>
                                  </div>
                                  {typeData.per_gene && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Per Gene:</span>
                                      <span className="font-mono">
                                        {typeData.per_gene.toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                  {typeData.exons_per_transcript && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Exons/Transcript:</span>
                                      <span className="font-mono">
                                        {typeData.exons_per_transcript.toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                  {typeData.length_stats?.mean && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Mean Length:</span>
                                      <span className="font-mono">
                                        {typeData.length_stats.mean.toLocaleString()} bp
                                      </span>
                                    </div>
                                  )}
                                  {typeData.length_stats?.median && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Median Length:</span>
                                      <span className="font-mono">
                                        {typeData.length_stats.median.toLocaleString()} bp
                                      </span>
                                    </div>
                                  )}
                                  {typeData.spliced_length_stats?.mean && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Mean Spliced:</span>
                                      <span className="font-mono">
                                        {typeData.spliced_length_stats.mean.toLocaleString()} bp
                                      </span>
                                    </div>
                                  )}
                                  {typeData.spliced_length_stats?.median && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Median Spliced:</span>
                                      <span className="font-mono">
                                        {typeData.spliced_length_stats.median.toLocaleString()} bp
                                      </span>
                                    </div>
                                  )}
                                  {typeData.exon_length_stats?.mean && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Mean Exon:</span>
                                      <span className="font-mono">
                                        {typeData.exon_length_stats.mean.toLocaleString()} bp
                                      </span>
                                    </div>
                                  )}
                                  {typeData.exon_length_stats?.median && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Median Exon:</span>
                                      <span className="font-mono">
                                        {typeData.exon_length_stats.median.toLocaleString()} bp
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )
            })}
          </div>

          {/* Load More Button */}
          {sortedTranscriptTypes.length > 10 && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setShowAllTranscripts(!showAllTranscripts)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
              >
                {showAllTranscripts 
                  ? `Show Less (${sortedTranscriptTypes.length - 10} hidden)`
                  : `Load More (+${sortedTranscriptTypes.length - 10} transcript types)`
                }
              </button>
            </div>
          )}

        </div>
        
        {/* Transcript stats chart with view selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-medium">
              {transcriptStatsView === 'mean_length' ? 'Mean Transcript Lengths by Type' : 'Exons per Transcript by Type'}
            </h5>
            <Select value={transcriptStatsView} onValueChange={(value: any) => onTranscriptStatsViewChange(value)}>
              <SelectTrigger className="w-[200px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mean_length">Mean Length</SelectItem>
                <SelectItem value="exons_per_transcript">Exons per Transcript</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="h-[400px]">
            {(() => {
              const filteredTypes = getFilteredTranscriptTypes(allTranscriptTypes, selectedTranscriptTypes)
              
              const categoryData = createCategoryDatasets(
                stats,
                filteredTypes,
                (cat, type) => {
                  const typeData = stats[cat].transcripts.types[type]
                  if (transcriptStatsView === 'mean_length') {
                    const lengthStats = typeData?.length_stats
                    return lengthStats?.mean || 0
                  } else {
                    return typeData?.exons_per_transcript || 0
                  }
                },
                selectedCategories
              )
              
              return (
                <Bar
                  data={{
                    labels: filteredTypes,
                    datasets: categoryData
                  }}
                  options={createBarChartOptions(
                    legendConfig,
                    createTooltipConfig({
                      formatLabel: (label, value, datasetLabel) => {
                        if (transcriptStatsView === 'mean_length') {
                          return `${datasetLabel}: ${value.toLocaleString()} bp`
                        } else {
                          return `${datasetLabel}: ${value.toFixed(2)} exons/transcript`
                        }
                      }
                    }),
                    {
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (v: any) => transcriptStatsView === 'mean_length' 
                              ? v.toLocaleString() 
                              : v.toFixed(1)
                          }
                        },
                        x: { ticks: { maxRotation: 45, minRotation: 45, font: { size: 9 } } }
                      }
                    }
                  )}
                />
              )
            })()}
          </div>
        </div>
      </div>
    </Card>
  )
}

