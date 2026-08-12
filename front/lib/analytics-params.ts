import { buildParamsFromFilters } from "@/lib/utils"
import type { FiltersState } from "@/lib/stores/annotations-filters"

export type AnalyticsDataSource = "current" | "subsets"

export interface AnalyticsParamsEntry {
  id: string
  name: string
  color?: string
  params: Record<string, unknown>
}

export interface AnalyticsSubsetInput {
  id: string
  name: string
  color?: string
  filters: FiltersState
}

/**
 * Build stable { id, name, color, params } entries for analytics fetches.
 * - "current" → one entry from currentParams (limit/offset stripped)
 * - "subsets" → one entry per selected subset via buildParamsFromFilters
 */
export function buildAnalyticsParamsEntries(opts: {
  dataSource: AnalyticsDataSource
  selectedSubsetIds: string[]
  currentParams: Record<string, unknown>
  subsets: AnalyticsSubsetInput[]
}): AnalyticsParamsEntry[] {
  const { dataSource, selectedSubsetIds, currentParams, subsets } = opts

  if (dataSource === "current") {
    const params = { ...currentParams }
    delete params.limit
    delete params.offset
    return [{ id: "current", name: "Current filters", params }]
  }

  return subsets
    .filter((s) => selectedSubsetIds.includes(s.id))
    .map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      params: buildParamsFromFilters(s.filters),
    }))
}
