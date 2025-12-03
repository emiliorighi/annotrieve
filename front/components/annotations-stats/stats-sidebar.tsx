"use client"

import { useState } from "react"
import { Card } from "@/components/ui"
import { Activity, Dna, FileText, ChevronRight } from "lucide-react"
import type { GeneStatsSummary, TranscriptStatsSummary } from "@/lib/api/annotations"
import { cn } from "@/lib/utils"

interface StatsSidebarProps {
  geneStats: GeneStatsSummary | null
  transcriptStats: TranscriptStatsSummary | null
  geneStatsLoading: boolean
  transcriptStatsLoading: boolean
  selectedGeneCategory: string | null
  selectedTranscriptType: string | null
  onGeneCategorySelect: (category: string | null) => void
  onTranscriptTypeSelect: (type: string | null) => void
}

export function StatsSidebar({
  geneStats,
  transcriptStats,
  geneStatsLoading,
  transcriptStatsLoading,
  selectedGeneCategory,
  selectedTranscriptType,
  onGeneCategorySelect,
  onTranscriptTypeSelect,
}: StatsSidebarProps) {
  const formatLabel = (str: string) => {
    return str.replace(/_/g, ' ')
  }

  return (
    <div className="h-full overflow-y-auto border-r border-border bg-background">
      <div className="p-4 space-y-6">
        {/* Gene Categories Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Dna className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Gene Categories</h3>
          </div>
          
          {geneStatsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Activity className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : geneStats && geneStats.categories && geneStats.categories.length > 0 ? (
            <div className="space-y-1">
              {geneStats.categories
                .map((category) => {
                  const categoryData = geneStats.summary?.genes?.[category]
                  return {
                    category,
                    categoryData,
                    count: categoryData?.annotations_count || 0,
                  }
                })
                .filter(({ count }) => count > 0)
                .sort((a, b) => b.count - a.count)
                .map(({ category, categoryData }) => {
                  const isSelected = selectedGeneCategory === category
                  
                  return (
                    <button
                      key={category}
                      onClick={() => onGeneCategorySelect(isSelected ? null : category)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between group",
                        isSelected
                          ? "bg-primary/10 text-primary font-medium border border-primary/20"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{formatLabel(category)}</div>
                        {categoryData && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {categoryData.annotations_count || 0} annotations
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })}
            </div>
          ) : (
            <div className="px-2 py-4 text-xs text-muted-foreground text-center">
              No gene categories available
            </div>
          )}
        </div>

        {/* Transcript Types Section */}
        <div className="space-y-3 border-t border-border pt-6">
          <div className="flex items-center gap-2 px-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Transcript Types</h3>
          </div>
          
          {transcriptStatsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Activity className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : transcriptStats && transcriptStats.types && transcriptStats.types.length > 0 ? (
            <div className="space-y-1">
              {transcriptStats.types
                .map((type) => {
                  const typeData = transcriptStats.summary?.types?.[type]
                  return {
                    type,
                    typeData,
                    count: typeData?.annotations_count || 0,
                  }
                })
                .sort((a, b) => b.count - a.count)
                .map(({ type, typeData }) => {
                  const isSelected = selectedTranscriptType === type
                  
                  return (
                    <button
                      key={type}
                      onClick={() => onTranscriptTypeSelect(isSelected ? null : type)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between group",
                        isSelected
                          ? "bg-primary/10 text-primary font-medium border border-primary/20"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{formatLabel(type)}</div>
                        {typeData && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {typeData.annotations_count || 0} annotations
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })}
            </div>
          ) : (
            <div className="px-2 py-4 text-xs text-muted-foreground text-center">
              No transcript types available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

