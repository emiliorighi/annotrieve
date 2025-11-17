"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BarChart3, Code, Layers, Workflow, Info, ExternalLink } from "lucide-react"
import { useState } from "react"
import {
  GENE_CATEGORIES,
  CATEGORY_LABELS,
  getAllTranscriptTypes,
  type GeneCategory,
} from '../file-overview-dialog-helpers'

interface OverviewSectionProps {
  stats: any
}

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

const renderValue = (value: any): number => {
  if (typeof value === 'object' && value !== null) {
    if (value.parsedValue !== undefined) {
      return Number(value.parsedValue)
    }
    if (value.source !== undefined) {
      return Number(value.source)
    }
    return Number(value)
  }
  return Number(value) || 0
}

export function OverviewSection({ stats }: OverviewSectionProps) {
  const TRANSCRIPT_TYPE_COUNT = 5
  const allTranscriptTypes = getAllTranscriptTypes(stats)
  const [showAllTranscripts, setShowAllTranscripts] = useState(false)
  const [selectedTranscriptType, setSelectedTranscriptType] = useState<string | null>(null)
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)

  // Calculate total count of all categories (for percentage calculations)
  const totalCount = GENE_CATEGORIES.filter(cat => stats[cat])
    .reduce((sum, cat) => sum + (stats[cat].count || 0), 0)

  // Calculate segments for the stacked bar
  const segments = GENE_CATEGORIES.filter(cat => stats[cat])
    .map((cat) => {
      const config = CATEGORY_CONFIG[cat]
      const count = stats[cat].count || 0
      const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0
      
      return {
        cat,
        config,
        count,
        percentage,
        width: percentage,
      }
    })

  // Calculate cumulative positions for stacking
  let cumulativePosition = 0
  const segmentsWithPosition = segments.map((segment) => {
    const position = cumulativePosition
    cumulativePosition += segment.width
    return { ...segment, position }
  })

  // Aggregate transcript type counts across all categories
  const transcriptTypeData = allTranscriptTypes.map(type => {
    let totalCount = 0
    const categoryCounts: Record<GeneCategory, number> = {
      coding_genes: 0,
      non_coding_genes: 0,
      pseudogenes: 0,
    }
    
    GENE_CATEGORIES.forEach(cat => {
      const typeData = stats[cat]?.transcripts?.types?.[type]
      if (typeData) {
        const count = typeData.count || 0
        categoryCounts[cat] = count
        totalCount += count
      }
    })

    return {
      type,
      totalCount,
      categoryCounts,
    }
  })

  // Sort by total count and get top 10
  const sortedTranscriptTypes = transcriptTypeData
    .sort((a, b) => b.totalCount - a.totalCount)
  
  const displayedTranscriptTypes = showAllTranscripts 
    ? sortedTranscriptTypes 
    : sortedTranscriptTypes.slice(0, TRANSCRIPT_TYPE_COUNT)

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h4 className="text-sm font-semibold">GFF Overview</h4>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInfoDialogOpen(true)}
            title="How statistics are computed"
          >
            Info
            <Info className="h-4 w-4" />
          </Button>
        </div>
      
      <div className="space-y-6">
        {/* Gene Count Range Bar */}
        <div>
          <h5 className="text-xs font-medium mb-4">Gene Counts by Category</h5>
          
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mb-3">
            {segments.map(({ cat, config, count, percentage }) => {
              const Icon = config.icon
              return (
                <div
                  key={cat}
                  className="flex items-center gap-2"
                >
                  <Icon className={`h-4 w-4 ${config.colorClass}`} />
                  <span className={`text-sm font-medium ${config.colorClass}`}>
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              )
            })}
          </div>

          {/* Stacked Bar */}
          <div className="relative h-12 rounded-lg overflow-hidden bg-muted border">
            {segmentsWithPosition.map(({ cat, config, count, percentage, position, width }) => (
              <div
                key={cat}
                className={`absolute h-full transition-all duration-300 ${config.bgClass} ${config.borderClass} border-r last:border-r-0 flex items-center justify-center group`}
                style={{
                  left: `${position}%`,
                  width: `${width}%`,
                }}
                title={`${CATEGORY_LABELS[cat]}: ${count.toLocaleString()} (${percentage.toFixed(1)}%)`}
              >
                {width > 8 && (
                  <span className={`text-xs font-semibold ${config.colorClass} whitespace-nowrap`}>
                    {count.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Gene Length Statistics */}
        <div>
          <h5 className="text-xs font-medium mb-3">Gene Length Statistics</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {GENE_CATEGORIES.filter(cat => stats[cat]?.length_stats).map((cat) => {
              const config = CATEGORY_CONFIG[cat]
              const Icon = config.icon
              const lengthStats = stats[cat].length_stats
              const min = renderValue(lengthStats?.min) || 0
              const max = renderValue(lengthStats?.max) || 0
              const mean = renderValue(lengthStats?.mean) || 0
              const range = max - min
              const meanPosition = range > 0 ? ((mean - min) / range) * 100 : 50

              return (
                <div
                  key={cat}
                  className={`rounded-lg p-4 border-2 ${config.bgClass} ${config.borderClass} shadow-md`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className={`h-4 w-4 ${config.colorClass}`} />
                    <h6 className={`text-sm font-semibold ${config.colorClass}`}>
                      {CATEGORY_LABELS[cat]}
                    </h6>
                  </div>

                  {/* Range Bar Visualization */}
                  <div className="space-y-3">

                    {/* Statistics */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Min Length:</span>
                        <span className="font-mono font-semibold">
                          {min.toLocaleString()} bp
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Mean Length:</span>
                        <span className={`font-mono font-semibold ${config.colorClass}`}>
                          {mean.toLocaleString()} bp
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Max Length:</span>
                        <span className="font-mono font-semibold">
                          {max.toLocaleString()} bp
                        </span>
                      </div>
                      {lengthStats?.median && (
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-muted-foreground">Median:</span>
                          <span className="font-mono">
                            {renderValue(lengthStats.median).toLocaleString()} bp
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stacked bar: Transcript counts per gene category */}
        {allTranscriptTypes.length > 0 && (
          <div>
            <h5 className="text-xs font-medium">Transcript Counts per Gene Category</h5>
            <span className="text-xs text-muted-foreground">Click on a transcript type to view detailed statistics</span>
            
            <div className="space-y-3 mt-2">
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
                    ? `Show Less (${sortedTranscriptTypes.length - TRANSCRIPT_TYPE_COUNT} hidden)`
                    : `Load More (+${sortedTranscriptTypes.length - TRANSCRIPT_TYPE_COUNT} transcript types)`
                  }
                </button>
              </div>
            )}
          </div>
        )}
        
      </div>
    </Card>

    <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How Statistics Are Computed</DialogTitle>
          <DialogDescription>
            Understanding how genes are categorized in the GFF statistics
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Gene Categorization Logic</h4>
            <p className="text-muted-foreground mb-3">
              Genes are categorized into three main groups based on their features and biotype:
            </p>
            
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="font-mono text-xs mb-2">def categorize_roots(roots: dict) -&gt; dict:</div>
                <div className="space-y-2 pl-4 text-xs font-mono text-muted-foreground">
                  <div>root_to_category = {}</div>
                  <div>for root_id, info in roots.items():</div>
                  <div className="pl-4 space-y-1">
                    <div>feature_type = info.feature_type</div>
                    <div>biotype = info.biotype or ''</div>
                    <div className="pt-2">
                      <div className="text-foreground font-semibold">if feature_type == 'pseudogene':</div>
                      <div className="pl-4">root_to_category[root_id] = 'pseudogene'</div>
                    </div>
                    <div className="pt-2">
                      <div className="text-foreground font-semibold">elif info.has_cds or 'protein_coding' in biotype.lower():</div>
                      <div className="pl-4">root_to_category[root_id] = 'coding'</div>
                    </div>
                    <div className="pt-2">
                      <div className="text-foreground font-semibold">elif info.has_exon:</div>
                      <div className="pl-4">root_to_category[root_id] = 'non_coding'</div>
                    </div>
                    <div className="pt-2">
                      <div className="text-foreground font-semibold">else:</div>
                      <div className="pl-4">root_to_category[root_id] = None</div>
                    </div>
                  </div>
                  <div className="pt-2">return root_to_category</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Category Definitions</h4>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">Pseudogenes:</span> Features where the feature_type is explicitly 'pseudogene'
              </li>
              <li>
                <span className="font-semibold text-foreground">Coding Genes:</span> Features that either have CDS segments or contain 'protein_coding' in their biotype
              </li>
              <li>
                <span className="font-semibold text-foreground">Non-coding Genes:</span> Features that have exons but don't meet the criteria for pseudogenes or coding genes. This includes various RNA types (tRNA, rRNA, lncRNA, miRNA, snRNA, etc.)
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 p-3 rounded-lg">
            <h4 className="font-semibold mb-2 text-yellow-900 dark:text-yellow-200">Note</h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Currently, all non-coding biotypes (tRNA, rRNA, lncRNA, miRNA, snRNA, snoRNA, etc.) are grouped together in the "non_coding_genes" category. 
              This simplification may not distinguish between biologically distinct classes of non-coding RNAs.
            </p>
          </div>

          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Do you think this categorization approach is correct, or would you like to see more granular categories?
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open('https://github.com/emiliorighi/annotrieve/issues/3', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Provide Feedback on GitHub
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
