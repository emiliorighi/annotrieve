"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, HardDrive, Dna } from "lucide-react"
import { AnnotationActions } from "@/components/annotation-actions"
import type { Annotation } from "@/lib/types"
import * as Checkbox from "@radix-ui/react-checkbox"

interface AnnotationCardProps {
  annotation: Annotation
  onJBrowseChange?: (accession: string, annotationId: string) => void
  isSelected: boolean
  onToggleSelection: () => void
}

function convertToHumanReadableSize(file_size: any) {
  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.floor(Math.log10(file_size) / 3)
  return (file_size / Math.pow(1024, index)).toFixed(2) + " " + units[index]
}

export function AnnotationCard({ annotation, onJBrowseChange, isSelected, onToggleSelection }: AnnotationCardProps) {
  const rootCounts = annotation.features_summary?.root_types_counts ?? {};
  const rootCountEntries = Object.entries(rootCounts).sort((a, b) => b[1] - a[1]);
  
  // Get top biotypes
  const topBiotypes = annotation.features_summary?.biotypes?.slice(0, 4) || [];
  const hasMoreBiotypes = (annotation.features_summary?.biotypes?.length || 0) > 4;
  
  // Get gene counts
  const codingGenes = annotation.features_statistics?.coding_genes?.count;
  const nonCodingGenes = annotation.features_statistics?.non_coding_genes?.count;
  const pseudogenes = annotation.features_statistics?.pseudogenes?.count;
  const hasGeneCounts = codingGenes !== undefined || nonCodingGenes !== undefined || pseudogenes !== undefined;
  
  return (
    <Card className={`group relative overflow-hidden transition-all duration-200 ${
      isSelected 
        ? 'border-primary bg-primary/5 shadow-md' 
        : 'border hover:border-primary/50 hover:shadow-lg hover:bg-muted/30'
    }`}>
      {/* Selection indicator bar */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 bg-primary" />
      )}
      
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          {/* <div className="flex items-start pt-1">
            <Checkbox.Root
              checked={isSelected}
              onCheckedChange={onToggleSelection}
              className="w-5 h-5 rounded border-2 border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary hover:border-primary/70 transition-colors flex items-center justify-center cursor-pointer"
            >
              <Checkbox.Indicator className="text-primary-foreground">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M11.5 3.5L5.25 9.75L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </Checkbox.Indicator>
            </Checkbox.Root>
          </div> */}

          <div className="flex-1 min-w-0 space-y-4">
            {/* Header Section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="secondary" 
                  className="text-xs font-semibold"
                >
                  {annotation.source_file_info.database}
                </Badge>
                <Badge variant="accent" className="text-xs">
                  {annotation.source_file_info.pipeline?.name || annotation.source_file_info.provider}
                </Badge>
                {annotation.source_file_info.pipeline?.version && (
                  <span className="text-xs text-muted-foreground">v{annotation.source_file_info.pipeline.version}</span>
                )}
              </div>
              
              <h4 className="text-base italic font-semibold mb-1 group-hover:text-primary transition-colors">
                {annotation.organism_name}
              </h4>
              
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-mono text-xs bg-muted/50 px-2 py-0.5 rounded">{annotation.assembly_accession}</span>
                <span className="text-xs">{annotation.assembly_name}</span>
              </div>
            </div>

            {/* Gene Counts */}
            {hasGeneCounts && (
              <div className="flex items-center gap-3 px-3 py-2 bg-accent/5 rounded-lg border border-accent/20">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Dna className="h-3.5 w-3.5 text-accent" />
                  <span className="font-medium">Genes:</span>
                </div>
                <div className="flex items-center gap-4">
                  {codingGenes !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Coding</span>
                      <span className="text-sm font-semibold text-foreground">{codingGenes.toLocaleString()}</span>
                    </div>
                  )}
                  {nonCodingGenes !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Non-coding</span>
                      <span className="text-sm font-semibold text-foreground">{nonCodingGenes.toLocaleString()}</span>
                    </div>
                  )}
                  {pseudogenes !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Pseudo</span>
                      <span className="text-sm font-semibold text-foreground">{pseudogenes.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Feature Stats Grid */}
            {rootCountEntries.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {rootCountEntries.map(([type, count]) => (
                  <div key={type} className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg px-3 py-2.5 border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="text-xs font-medium text-muted-foreground mb-1 capitalize">{type}</div>
                    <div className="text-lg font-bold text-foreground">{count.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Biotypes Tags */}
            {topBiotypes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Biotypes:</span>
                {topBiotypes.map((biotype) => (
                  <Badge key={biotype} variant="outline" className="text-xs">
                    {biotype}
                  </Badge>
                ))}
                {hasMoreBiotypes && (
                  <span className="text-xs text-muted-foreground">
                    +{(annotation.features_summary?.biotypes?.length || 0) - 4} more
                  </span>
                )}
              </div>
            )}

            {/* Metadata Footer */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5" />
                <span>{convertToHumanReadableSize(annotation.indexed_file_info.file_size)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{new Date(annotation.source_file_info.release_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-start pt-1">
            <AnnotationActions annotation={annotation} onJBrowseChange={onJBrowseChange} />
          </div>
        </div>
      </div>
    </Card>
  )
}

