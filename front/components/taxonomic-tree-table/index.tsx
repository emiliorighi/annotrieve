'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { getTaxon } from '@/lib/api/taxons'
import { useTaxonomicTreeStore } from '@/lib/stores/taxonomic-tree'
import { useAnnotationsFiltersStore } from '@/lib/stores/annotations-filters'
import { Filters } from './filters'
import { SelectedTaxons } from './selected-taxons'
import { TreeTable } from './tree-table'

interface TaxonomicTreeTableProps {
  rootTaxid?: string
  onNodeClick?: (taxid: string) => void
  maxDepth?: number
  view?: 'taxon' | 'organism' | 'all'
  showSearch?: boolean
  showRankFilter?: boolean
  selectedTaxid?: string | null
}

function useTaxon(taxid: string) {
  return useQuery({
    queryKey: ['taxon', taxid],
    queryFn: () => getTaxon(taxid),
    staleTime: 5 * 60 * 1000,
  })
}

export function TaxonomicTreeTable({
  rootTaxid = '2759',
  onNodeClick,
  showSearch = true,
  showRankFilter = true,
  selectedTaxid: propSelectedTaxid = null,
}: TaxonomicTreeTableProps) {
  const storeSelectedTaxons = useAnnotationsFiltersStore((state) => state.selectedTaxons)
  const {
    rootNode,
    isLoadingRoot,
    rootError,
    isSearchMode,
    isSearchingFromBar,
    selectedRank,
    loadingRankRoots,
    fetchRootNode,
    fetchSelectedTaxon,
    fetchRankFrequencies,
    initializeFromStore
  } = useTaxonomicTreeStore()

  const { data: queryRootNode, isLoading: queryIsLoading, error: queryError } = useTaxon(rootTaxid)

  // Sync query result with store
  useEffect(() => {
    if (queryRootNode) {
      useTaxonomicTreeStore.setState({ rootNode: queryRootNode })
    }
  }, [queryRootNode])

  // Initialize root node
  useEffect(() => {
    if (!rootNode && !queryIsLoading) {
      fetchRootNode(rootTaxid)
    }
  }, [rootTaxid, rootNode, queryIsLoading, fetchRootNode])

  // Initialize selected taxons from store
  useEffect(() => {
    if (storeSelectedTaxons.length > 0 && rootNode) {
      initializeFromStore(storeSelectedTaxons)
    }
  }, [storeSelectedTaxons, rootNode, initializeFromStore])

  // Fetch selected taxon when prop changes
  useEffect(() => {
    if (propSelectedTaxid) {
      fetchSelectedTaxon(propSelectedTaxid)
    }
  }, [propSelectedTaxid, fetchSelectedTaxon])

  // Load rank frequencies
  useEffect(() => {
    if (showRankFilter) {
      fetchRankFrequencies()
    }
  }, [showRankFilter, fetchRankFrequencies])

  // Early returns
  if ((queryIsLoading || isLoadingRoot) && !selectedRank) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Loading taxonomy tree...</p>
        </div>
      </div>
    )
  }

  if ((queryError || rootError || !rootNode) && !selectedRank) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load taxonomy tree</p>
          <p className="text-sm text-muted-foreground">Please try again</p>
        </div>
      </div>
    )
  }

  // Check if we have data to display
  const hasData = rootNode || selectedRank || isSearchMode
  if (!hasData && !loadingRankRoots && !isSearchingFromBar && !isSearchMode) {
    return null
  }

  return (
    <div className="w-full space-y-4">
      {/* Search and Filters */}
      {(showSearch || showRankFilter) && (
        <Filters showSearch={showSearch} showRankFilter={showRankFilter} />
      )}

      {/* Selected Taxons */}
      <SelectedTaxons />

      {/* Table */}
      <TreeTable
        rootTaxid={rootTaxid}
        rootNode={rootNode}
        selectedTaxid={propSelectedTaxid}
        onNodeClick={onNodeClick}
      />
    </div>
  )
}

