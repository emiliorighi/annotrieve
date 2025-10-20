"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, FileText, Calendar, HardDrive, Tag, Layers, BarChart3, Building2, Code, Workflow, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import type { Annotation } from "@/lib/types"

interface FileOverviewDialogProps {
  annotation: Annotation
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FileOverviewDialog({ annotation, open, onOpenChange }: FileOverviewDialogProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [selectedGeneCategory, setSelectedGeneCategory] = useState<'coding_genes' | 'non_coding_genes' | 'pseudogenes'>('coding_genes')

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Annotation Overview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Source and File Overview */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-semibold">Source & File Overview</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Information */}
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source Information</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Database</span>
                    <Badge variant={annotation.source_file_info?.database === "GenBank" ? "default" : "secondary"}>
                      {annotation.source_file_info?.database || "Unknown"}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-mono text-xs">{annotation.source_file_info?.provider || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Pipeline</span>
                    <span className="font-mono text-xs">{annotation.source_file_info?.pipeline?.name || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Release Date</span>
                    <span className="text-xs">
                      {annotation.source_file_info?.release_date ? 
                        new Date(annotation.source_file_info.release_date).toLocaleDateString() : 
                        "Unknown"
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* File Information */}
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">File Information</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">File Size</span>
                    <span className="font-mono text-xs">
                      {annotation.indexed_file_info?.file_size ? 
                        `${(annotation.indexed_file_info.file_size / 1024 / 1024).toFixed(2)} MB` : 
                        "Unknown"
                      }
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Index Size</span>
                    <span className="font-mono text-xs">
                      {annotation.indexed_file_info?.csi_path ? 
                        "CSI Index Available" : 
                        "Unknown"
                      }
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Format</span>
                    <span className="font-mono text-xs">GFF3 (gzipped, tabix indexed)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Processed At</span>
                    <span className="text-xs">
                      {annotation.indexed_file_info?.processed_at ? 
                        new Date(annotation.indexed_file_info.processed_at).toLocaleDateString() : 
                        "Unknown"
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Features Summary */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-semibold">Features Summary</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Biotypes */}
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Biotypes</h5>
                {annotation.features_summary?.biotypes && annotation.features_summary.biotypes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(expandedSections['biotypes'] 
                      ? annotation.features_summary.biotypes 
                      : annotation.features_summary.biotypes.slice(0, 10)
                    ).map((biotype) => (
                      <Badge key={biotype} variant="outline" className="text-xs">
                        {biotype}
                      </Badge>
                    ))}
                    {annotation.features_summary.biotypes.length > 10 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={() => toggleSection('biotypes')}
                      >
                        {expandedSections['biotypes'] ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            +{annotation.features_summary.biotypes.length - 10} more
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No biotypes available</span>
                )}
              </div>

              {/* Types */}
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Feature Types</h5>
                {annotation.features_summary?.types && annotation.features_summary.types.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(expandedSections['types'] 
                      ? annotation.features_summary.types 
                      : annotation.features_summary.types.slice(0, 10)
                    ).map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                    {annotation.features_summary.types.length > 10 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={() => toggleSection('types')}
                      >
                        {expandedSections['types'] ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            +{annotation.features_summary.types.length - 10} more
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No types available</span>
                )}
              </div>

              {/* Sources */}
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sources</h5>
                {annotation.features_summary?.sources && annotation.features_summary.sources.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(expandedSections['sources'] 
                      ? annotation.features_summary.sources 
                      : annotation.features_summary.sources.slice(0, 10)
                    ).map((source) => (
                      <Badge key={source} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                    {annotation.features_summary.sources.length > 10 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={() => toggleSection('sources')}
                      >
                        {expandedSections['sources'] ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            +{annotation.features_summary.sources.length - 10} more
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No sources available</span>
                )}
              </div>

              {/* Missing IDs */}
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Missing IDs</h5>
                {annotation.features_summary?.types_missing_id && annotation.features_summary.types_missing_id.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(expandedSections['types_missing_id'] 
                      ? annotation.features_summary.types_missing_id 
                      : annotation.features_summary.types_missing_id.slice(0, 10)
                    ).map((type) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {type}
                      </Badge>
                    ))}
                    {annotation.features_summary.types_missing_id.length > 10 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={() => toggleSection('types_missing_id')}
                      >
                        {expandedSections['types_missing_id'] ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            +{annotation.features_summary.types_missing_id.length - 10} more
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No missing IDs</span>
                )}
              </div>
            </div>
          </Card>

          {/* Annotation Statistics */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-semibold">GFF Statistics</h4>
              <span className="text-xs text-muted-foreground ml-2">(Click a category to see details)</span>
            </div>
            
            {(annotation as any).features_statistics ? (
              <div className="space-y-6">
                {/* Gene Categories Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Coding Genes */}
                  {(annotation as any).features_statistics.coding_genes && (
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
                            {(annotation as any).features_statistics.coding_genes.count?.toLocaleString() || "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Length:</span>
                          <span className="font-mono">
                            {renderValue((annotation as any).features_statistics.coding_genes.length_stats?.mean)} bp
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transcripts:</span>
                          <span className="font-mono">
                            {(annotation as any).features_statistics.coding_genes.transcripts?.count?.toLocaleString() || "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Per Gene:</span>
                          <span className="font-mono">
                            {renderValue((annotation as any).features_statistics.coding_genes.transcripts?.per_gene)}
                          </span>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Non-coding Genes */}
                  {(annotation as any).features_statistics.non_coding_genes && (
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
                            {(annotation as any).features_statistics.non_coding_genes.count?.toLocaleString() || "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Length:</span>
                          <span className="font-mono">
                            {renderValue((annotation as any).features_statistics.non_coding_genes.length_stats?.mean)} bp
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transcripts:</span>
                          <span className="font-mono">
                            {(annotation as any).features_statistics.non_coding_genes.transcripts?.count?.toLocaleString() || "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Per Gene:</span>
                          <span className="font-mono">
                            {renderValue((annotation as any).features_statistics.non_coding_genes.transcripts?.per_gene)}
                          </span>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Pseudogenes */}
                  {(annotation as any).features_statistics.pseudogenes && (
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
                            {(annotation as any).features_statistics.pseudogenes.count?.toLocaleString() || "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Length:</span>
                          <span className="font-mono">
                            {renderValue((annotation as any).features_statistics.pseudogenes.length_stats?.mean)} bp
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transcripts:</span>
                          <span className="font-mono">
                            {(annotation as any).features_statistics.pseudogenes.transcripts?.count?.toLocaleString() || "0"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Per Gene:</span>
                          <span className="font-mono">
                            {renderValue((annotation as any).features_statistics.pseudogenes.transcripts?.per_gene)}
                          </span>
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Detailed View for Selected Category */}
                {(annotation as any).features_statistics[selectedGeneCategory] && (
                  <div className="space-y-6 p-4 bg-muted/30 rounded-lg border-2 border-dashed">
                    {/* Transcript Types */}
                    {(annotation as any).features_statistics[selectedGeneCategory]?.transcripts?.types && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-semibold">Transcript Types</h5>
                          <Badge variant="outline" className="text-xs">
                            {Object.keys((annotation as any).features_statistics[selectedGeneCategory].transcripts.types).length} types
                          </Badge>
                        </div>
                        {renderBadges(
                          Object.fromEntries(
                            Object.entries((annotation as any).features_statistics[selectedGeneCategory].transcripts.types)
                              .map(([type, data]: [string, any]) => [type, data.count])
                          ),
                          `${selectedGeneCategory}_transcript_types`,
                          6
                        )}
                      </div>
                    )}

                    {/* Features Details */}
                    {(annotation as any).features_statistics[selectedGeneCategory]?.features && (
                      <div>
                        <h5 className="text-sm font-semibold mb-3">Features Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Exons */}
                          {(annotation as any).features_statistics[selectedGeneCategory].features?.exons && (
                            <div className="bg-background rounded-lg p-3 border">
                              <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Exons</h6>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Count:</span>
                                  <span className="font-mono font-semibold">
                                    {(annotation as any).features_statistics[selectedGeneCategory].features.exons.count?.toLocaleString() || "0"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Avg Length:</span>
                                  <span className="font-mono">
                                    {renderValue((annotation as any).features_statistics[selectedGeneCategory].features.exons.length_stats?.mean)} bp
                                  </span>
                                </div>
                                {(annotation as any).features_statistics[selectedGeneCategory].features.exons.length_stats?.median && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Median:</span>
                                    <span className="font-mono">
                                      {renderValue((annotation as any).features_statistics[selectedGeneCategory].features.exons.length_stats.median)} bp
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* CDS */}
                          {(annotation as any).features_statistics[selectedGeneCategory].features?.cds && (
                            <div className="bg-background rounded-lg p-3 border">
                              <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">CDS</h6>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Count:</span>
                                  <span className="font-mono font-semibold">
                                    {(annotation as any).features_statistics[selectedGeneCategory].features.cds.count?.toLocaleString() || "0"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Avg Length:</span>
                                  <span className="font-mono">
                                    {renderValue((annotation as any).features_statistics[selectedGeneCategory].features.cds.length_stats?.mean)} bp
                                  </span>
                                </div>
                                {(annotation as any).features_statistics[selectedGeneCategory].features.cds.length_stats?.median && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Median:</span>
                                    <span className="font-mono">
                                      {renderValue((annotation as any).features_statistics[selectedGeneCategory].features.cds.length_stats.median)} bp
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Introns */}
                          {(annotation as any).features_statistics[selectedGeneCategory].features?.introns && (
                            <div className="bg-background rounded-lg p-3 border">
                              <h6 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Introns</h6>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Count:</span>
                                  <span className="font-mono font-semibold">
                                    {(annotation as any).features_statistics[selectedGeneCategory].features.introns.count?.toLocaleString() || "0"}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Avg Length:</span>
                                  <span className="font-mono">
                                    {renderValue((annotation as any).features_statistics[selectedGeneCategory].features.introns.length_stats?.mean)} bp
                                  </span>
                                </div>
                                {(annotation as any).features_statistics[selectedGeneCategory].features.introns.length_stats?.median && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Median:</span>
                                    <span className="font-mono">
                                      {renderValue((annotation as any).features_statistics[selectedGeneCategory].features.introns.length_stats.median)} bp
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
            ) : (
              <div className="text-center py-4">
                <span className="text-sm text-muted-foreground">No statistics available</span>
              </div>
            )}
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
