"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, Code, Layers, Workflow, ChevronDown, ChevronUp } from "lucide-react"
import type { Annotation } from "@/lib/types"
import { useState } from "react"

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
          {/* Coding Genes */}
          {stats.coding_genes && (
            <button
              onClick={() => setSelectedGeneCategory('coding_genes')}
              className={`text-left rounded-lg p-4 transition-all border-2 ${
                selectedGeneCategory === 'coding_genes'
                  ? 'bg-primary/20 border-primary shadow-md'
                  : 'bg-primary/10 border-transparent hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Code className="h-4 w-4 text-primary" />
                <h5 className="text-sm font-semibold text-primary">Coding Genes</h5>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Count:</span>
                  <span className="font-mono font-semibold">
                    {stats.coding_genes.count?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Length:</span>
                  <span className="font-mono">
                    {renderValue(stats.coding_genes.length_stats?.mean)} bp
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transcripts:</span>
                  <span className="font-mono">
                    {stats.coding_genes.transcripts?.count?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per Gene:</span>
                  <span className="font-mono">
                    {renderValue(stats.coding_genes.transcripts?.per_gene)}
                  </span>
                </div>
              </div>
            </button>
          )}

          {/* Non-coding Genes */}
          {stats.non_coding_genes && (
            <button
              onClick={() => setSelectedGeneCategory('non_coding_genes')}
              className={`text-left rounded-lg p-4 transition-all border-2 ${
                selectedGeneCategory === 'non_coding_genes'
                  ? 'bg-secondary/20 border-secondary shadow-md'
                  : 'bg-secondary/10 border-transparent hover:border-secondary/50 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-secondary" />
                <h5 className="text-sm font-semibold text-secondary">Non-coding Genes</h5>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Count:</span>
                  <span className="font-mono font-semibold">
                    {stats.non_coding_genes.count?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Length:</span>
                  <span className="font-mono">
                    {renderValue(stats.non_coding_genes.length_stats?.mean)} bp
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transcripts:</span>
                  <span className="font-mono">
                    {stats.non_coding_genes.transcripts?.count?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per Gene:</span>
                  <span className="font-mono">
                    {renderValue(stats.non_coding_genes.transcripts?.per_gene)}
                  </span>
                </div>
              </div>
            </button>
          )}

          {/* Pseudogenes */}
          {stats.pseudogenes && (
            <button
              onClick={() => setSelectedGeneCategory('pseudogenes')}
              className={`text-left rounded-lg p-4 transition-all border-2 ${
                selectedGeneCategory === 'pseudogenes'
                  ? 'bg-accent/20 border-accent shadow-md'
                  : 'bg-accent/10 border-transparent hover:border-accent/50 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Workflow className="h-4 w-4 text-accent" />
                <h5 className="text-sm font-semibold text-accent">Pseudogenes</h5>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Count:</span>
                  <span className="font-mono font-semibold">
                    {stats.pseudogenes.count?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Length:</span>
                  <span className="font-mono">
                    {renderValue(stats.pseudogenes.length_stats?.mean)} bp
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transcripts:</span>
                  <span className="font-mono">
                    {stats.pseudogenes.transcripts?.count?.toLocaleString() || "0"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per Gene:</span>
                  <span className="font-mono">
                    {renderValue(stats.pseudogenes.transcripts?.per_gene)}
                  </span>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Detailed View for Selected Category */}
        {stats[selectedGeneCategory] && (
          <div className="space-y-6 p-4 bg-muted/30 rounded-lg border-2 border-dashed">
            {/* Transcript Types */}
            {stats[selectedGeneCategory]?.transcripts?.types && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-semibold">Transcript Types</h5>
                  <Badge variant="outline" className="text-xs">
                    {Object.keys(stats[selectedGeneCategory].transcripts.types).length} types
                  </Badge>
                </div>
                {renderBadges(
                  Object.fromEntries(
                    Object.entries(stats[selectedGeneCategory].transcripts.types)
                      .map(([type, data]: [string, any]) => [type, data.count])
                  ),
                  `${selectedGeneCategory}_transcript_types`,
                  6
                )}
              </div>
            )}

            {/* Features Details */}
            {stats[selectedGeneCategory]?.features && (
              <div>
                <h5 className="text-sm font-semibold mb-3">Features Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Exons */}
                  {stats[selectedGeneCategory].features?.exons && (
                    <div className="bg-background rounded-lg p-3 border">
                      <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Exons</h6>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Count:</span>
                          <span className="font-mono font-semibold">
                            {stats[selectedGeneCategory].features.exons.count?.toLocaleString() || "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Length:</span>
                          <span className="font-mono">
                            {renderValue(stats[selectedGeneCategory].features.exons.length_stats?.mean)} bp
                          </span>
                        </div>
                        {stats[selectedGeneCategory].features.exons.length_stats?.median && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Median:</span>
                            <span className="font-mono">
                              {renderValue(stats[selectedGeneCategory].features.exons.length_stats.median)} bp
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CDS */}
                  {stats[selectedGeneCategory].features?.cds && (
                    <div className="bg-background rounded-lg p-3 border">
                      <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">CDS</h6>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Count:</span>
                          <span className="font-mono font-semibold">
                            {stats[selectedGeneCategory].features.cds.count?.toLocaleString() || "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Length:</span>
                          <span className="font-mono">
                            {renderValue(stats[selectedGeneCategory].features.cds.length_stats?.mean)} bp
                          </span>
                        </div>
                        {stats[selectedGeneCategory].features.cds.length_stats?.median && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Median:</span>
                            <span className="font-mono">
                              {renderValue(stats[selectedGeneCategory].features.cds.length_stats.median)} bp
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Introns */}
                  {stats[selectedGeneCategory].features?.introns && (
                    <div className="bg-background rounded-lg p-3 border">
                      <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Introns</h6>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Count:</span>
                          <span className="font-mono font-semibold">
                            {stats[selectedGeneCategory].features.introns.count?.toLocaleString() || "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Length:</span>
                          <span className="font-mono">
                            {renderValue(stats[selectedGeneCategory].features.introns.length_stats?.mean)} bp
                          </span>
                        </div>
                        {stats[selectedGeneCategory].features.introns.length_stats?.median && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Median:</span>
                            <span className="font-mono">
                              {renderValue(stats[selectedGeneCategory].features.introns.length_stats.median)} bp
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

