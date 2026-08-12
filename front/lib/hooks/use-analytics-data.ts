"use client"

import { useMemo } from "react"
import { useAnnotationsFiltersStore } from "@/lib/stores/annotations-filters"
import { useAnnotationSubsetsStore } from "@/lib/stores/annotation-subsets"
import {
  buildAnalyticsParamsEntries,
  type AnalyticsParamsEntry,
} from "@/lib/analytics-params"

export type DataSource = "current" | "subsets"

export type ParamsEntry = AnalyticsParamsEntry

interface UseAnalyticsDataOptions {
  dataSource: DataSource
  selectedSubsetIds: string[]
}

/**
 * Returns a stable list of { id, name, color, params } entries for fetching stats.
 * - "current"  → single entry built from the active annotations-filters store.
 * - "subsets"  → one entry per selected saved subset.
 */
export function useAnalyticsData({
  dataSource,
  selectedSubsetIds,
}: UseAnalyticsDataOptions): ParamsEntry[] {
  const buildAnnotationsParams = useAnnotationsFiltersStore(
    (state) => state.buildAnnotationsParams
  )
  const subsets = useAnnotationSubsetsStore((state) => state.subsets)

  return useMemo<ParamsEntry[]>(() => {
    const currentParams = buildAnnotationsParams(false, [])
    return buildAnalyticsParamsEntries({
      dataSource,
      selectedSubsetIds,
      currentParams,
      subsets,
    })
  }, [dataSource, selectedSubsetIds, subsets, buildAnnotationsParams])
}
