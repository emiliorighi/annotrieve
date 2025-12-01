"use client"

import { OverviewSection } from "./overview-section"
import { TranscriptLevelSection } from "./transcript-level-section"
import {
  getAllTranscriptTypes,
  type GeneCategory,
} from '../file-overview-dialog-helpers'

interface StatisticsDashboardProps {
  stats: any
  selectedCategories: Set<GeneCategory>
  selectedTranscriptTypes: Set<string>
  onCategoryToggle: (category: GeneCategory) => void
  onTranscriptTypeToggle: (type: string) => void
  transcriptStatsView: 'mean_length' | 'exons_per_transcript'
  onTranscriptStatsViewChange: (view: 'mean_length' | 'exons_per_transcript') => void
}

export function StatisticsDashboard({
  stats,
  selectedCategories,
  selectedTranscriptTypes,
  onCategoryToggle,
  onTranscriptTypeToggle,
  transcriptStatsView,
  onTranscriptStatsViewChange,
}: StatisticsDashboardProps) {
  const allTranscriptTypes = getAllTranscriptTypes(stats)

  return (
    <div className="mt-6 space-y-6">      
      <OverviewSection
        stats={stats}
      />
      
      {allTranscriptTypes.length > 0 && (
        <TranscriptLevelSection
          stats={stats}
          allTranscriptTypes={allTranscriptTypes}
          selectedCategories={selectedCategories}
          selectedTranscriptTypes={selectedTranscriptTypes}
          onCategoryToggle={onCategoryToggle}
          onTranscriptTypeToggle={onTranscriptTypeToggle}
          transcriptStatsView={transcriptStatsView}
          onTranscriptStatsViewChange={onTranscriptStatsViewChange}
        />
      )}
    </div>
  )
}

