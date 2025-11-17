'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Network } from 'lucide-react'
import { TaxonSearchBar, type TaxonSearchResult } from "@/components/taxon-search-bar"
import { createTaxonSearchModel } from "@/lib/search-models"
import { useTaxonomicTreeStore } from '@/lib/stores/taxonomic-tree'

const MAJOR_RANKS = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species']

interface FiltersProps {
  showSearch?: boolean
  showRankFilter?: boolean
}

export function Filters({ showSearch = true, showRankFilter = true }: FiltersProps) {
  const searchBarModels = useMemo(() => [createTaxonSearchModel(10)], [])
  
  const {
    searchQuery,
    selectedRank,
    rankFrequencies,
    loadingRanks,
    isSearchMode,
    setSearchQuery,
    handleSearchResults,
    handleNoSearchResults,
    setSearchingFromBar,
    clearSearch,
    setSelectedRank
  } = useTaxonomicTreeStore()

  const handleSearchBarSelect = (result: TaxonSearchResult) => {
    setSearchQuery(result.title || '')
  }

  const sortedRanks = useMemo(() => {
    return Object.entries(rankFrequencies)
      .filter(([rank]) => rank && rank !== 'no_value')
      .sort((a, b) => {
        const aIndex = MAJOR_RANKS.indexOf(a[0].toLowerCase())
        const bIndex = MAJOR_RANKS.indexOf(b[0].toLowerCase())
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        return a[0].localeCompare(b[0])
      })
  }, [rankFrequencies])

  if (!showSearch && !showRankFilter) return null

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {showSearch && (
        <div className="flex-1 min-w-[300px] flex items-center gap-2">
          <TaxonSearchBar
            className="flex-1"
            placeholder="Search taxons by name or taxid..."
            models={searchBarModels}
            value={searchQuery}
            onQueryChange={setSearchQuery}
            onResults={handleSearchResults}
            onSelect={handleSearchBarSelect}
            onNoResults={handleNoSearchResults}
            onSearchingChange={setSearchingFromBar}
          />
          {(isSearchMode || selectedRank) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearSearch}
              className="shrink-0"
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}
      
      {showRankFilter && !isSearchMode && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by Rank:</span>
          </div>
          <Select 
            value={selectedRank || 'all'} 
            onValueChange={(value) => setSelectedRank(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Kingdom > Phylum > Class > Order > Family > Genus > Species" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              <SelectItem value="all">Full hierarchy</SelectItem>
              {sortedRanks.map(([rank, count]) => (
                <SelectItem key={rank} value={rank}>
                  {rank.charAt(0).toUpperCase() + rank.slice(1)} ({count.toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {loadingRanks && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  )
}

