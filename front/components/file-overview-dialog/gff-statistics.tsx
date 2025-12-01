"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, Code, Layers, Workflow, ChevronDown, ChevronUp } from "lucide-react"
import type { Annotation } from "@/lib/types"
import { useState } from "react"
import {
  getGeneCategoryStats,
  getTranscriptCountForCategory,
  getTranscriptsPerGeneForCategory,
  getExonStatsForCategory,
  getCdsStatsForCategory,
  getTranscriptTypesForCategory,
  getTranscriptTypeDataForCategory,
  GENE_CATEGORIES,
  type GeneCategory,
} from '../file-overview-dialog-helpers'

interface GffStatisticsProps {
  annotation: Annotation
}

export function GffStatistics({ annotation }: GffStatisticsProps) {
  const [selectedGeneCategory, setSelectedGeneCategory] = useState<'coding_genes' | 'non_coding_genes' | 'pseudogenes'>('coding_genes')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const renderValue = (value: any): string => {
    if (typeof value === 'object' && value !== null) {
      if (value.parsedValue !== undefined) {
        return value.parsedValue.toString()
      }
      if (value.source !== undefined) {
        return value.source.toString()
      }
      return value.toString()
    }
    return value?.toString() || '0'
  }

  const renderBadges = (items: Record<string, any>, section: string, maxItems: number = 8) => {
    const entries = Object.entries(items)
    const isExpanded = expandedSections[section] || false
    const displayItems = isExpanded ? entries : entries.slice(0, maxItems)
    const hasMore = entries.length > maxItems

    return (
      <div className="flex flex-wrap gap-1">
        {displayItems
          .sort(([,a], [,b]) => Number(renderValue(b)) - Number(renderValue(a)))
          .map(([key, value]) => (
            <Badge key={key} variant="secondary" className="text-xs">
              {key} ({renderValue(value)})
            </Badge>
          ))}
        {hasMore && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-6 px-2"
            onClick={() => toggleSection(section)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                +{entries.length - maxItems} more
              </>
            )}
          </Button>
        )}
      </div>
    )
  }

  if (!(annotation as any).features_statistics) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h4 className="text-sm font-semibold">GFF Statistics</h4>
        </div>
        <div className="text-center py-4">
          <span className="text-sm text-muted-foreground">No statistics available</span>
        </div>
      </Card>
    )
  }

  const stats = (annotation as any).features_statistics

  // Helper to render a gene category card
  const renderGeneCategoryCard = (category: GeneCategory, icon: typeof Code, colorClass: string, bgClass: string, borderClass: string) => {
    const categoryStats = getGeneCategoryStats(stats, category)
    if (!categoryStats) return null

    const transcriptCount = getTranscriptCountForCategory(stats, category)
    const transcriptsPerGene = getTranscriptsPerGeneForCategory(stats, category)
    const Icon = icon

    return (
      <button
        key={category}
        onClick={() => setSelectedGeneCategory(category)}
        className={`text-left rounded-lg p-4 transition-all border-2 ${
          selectedGeneCategory === category
            ? `${bgClass.replace('/10', '/20')} ${borderClass} shadow-md`
            : `${bgClass} border-transparent hover:${borderClass.replace('border-', 'border-')}/50 hover:shadow-sm`
        }`}
      >
        <div className={`flex items-center gap-2 mb-3 ${colorClass}`}>
          <Icon className={`h-4 w-4 ${colorClass}`} />
          <h5 className={`text-sm font-semibold ${colorClass}`}>
            {category === 'coding_genes' ? 'Coding Genes' : category === 'non_coding_genes' ? 'Non-coding Genes' : 'Pseudogenes'}
          </h5>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Count:</span>
            <span className="font-mono font-semibold">
              {categoryStats.total_count?.toLocaleString() || "0"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Length:</span>
            <span className="font-mono">
              {renderValue(categoryStats.length_stats?.mean)} bp
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transcripts:</span>
            <span className="font-mono">
              {transcriptCount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Per Gene:</span>
            <span className="font-mono">
              {transcriptsPerGene.toFixed(2)}
            </span>
          </div>
        </div>
      </button>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h4 className="text-sm font-semibold">GFF Statistics</h4>
        <span className="text-xs text-muted-foreground ml-2">(Click a category to see details)</span>
      </div>
      
      <div className="space-y-6">
        {/* Gene Categories Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderGeneCategoryCard('coding_genes', Code, 'text-primary', 'bg-primary/10', 'border-primary')}
          {renderGeneCategoryCard('non_coding_genes', Layers, 'text-secondary', 'bg-secondary/10', 'border-secondary')}
          {renderGeneCategoryCard('pseudogenes', Workflow, 'text-accent', 'bg-accent/10', 'border-accent')}
        </div>

        {/* Detailed View for Selected Category */}
        {getGeneCategoryStats(stats, selectedGeneCategory) && (
          <div className="space-y-6 p-4 bg-muted/30 rounded-lg border-2 border-dashed">
            {/* Transcript Types */}
            {(() => {
              const transcriptTypes = getTranscriptTypesForCategory(stats, selectedGeneCategory)
              if (transcriptTypes.length === 0) return null
              
              const categoryStats = getGeneCategoryStats(stats, selectedGeneCategory)
              const transcriptTypeCounts = categoryStats?.transcript_type_counts || {}
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-semibold">Transcript Types</h5>
                    <Badge variant="outline" className="text-xs">
                      {transcriptTypes.length} types
                    </Badge>
                  </div>
                  {renderBadges(
                    transcriptTypeCounts,
                    `${selectedGeneCategory}_transcript_types`,
                    6
                  )}
                </div>
              )
            })()}

            {/* Features Details */}
            {(() => {
              const exonStats = getExonStatsForCategory(stats, selectedGeneCategory)
              const cdsStats = getCdsStatsForCategory(stats, selectedGeneCategory)
              
              if (exonStats.count === 0 && cdsStats.count === 0) return null
              
              return (
                <div>
                  <h5 className="text-sm font-semibold mb-3">Features Details</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Exons */}
                    {exonStats.count > 0 && (
                      <div className="bg-background rounded-lg p-3 border">
                        <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Exons</h6>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Count:</span>
                            <span className="font-mono font-semibold">
                              {exonStats.count.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Length:</span>
                            <span className="font-mono">
                              {renderValue(exonStats.length_stats?.mean)} bp
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CDS */}
                    {cdsStats.count > 0 && (
                      <div className="bg-background rounded-lg p-3 border">
                        <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">CDS</h6>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Count:</span>
                            <span className="font-mono font-semibold">
                              {cdsStats.count.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Length:</span>
                            <span className="font-mono">
                              {renderValue(cdsStats.length_stats?.mean)} bp
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </Card>
  )
}

