"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { CompactTaxonomicTree } from "@/components/compact-taxonomic-tree"
import type { TaxonRecord } from "@/lib/api/types"

interface TaxonTabProps {
  selectedTaxids: string[]
  taxonSearchQuery: string
  setTaxonSearchQuery: (query: string) => void
  taxonSearchResults: TaxonRecord[]
  taxonSearchLoading: boolean
  expandedTaxonNodes: Set<string>
  setExpandedTaxonNodes: (nodes: Set<string>) => void
  onTaxonSelect: (taxon: TaxonRecord) => void
  onTaxonToggle: (taxid: string) => void
}

export function TaxonTab({
  selectedTaxids,
  taxonSearchQuery,
  setTaxonSearchQuery,
  taxonSearchResults,
  taxonSearchLoading,
  expandedTaxonNodes,
  setExpandedTaxonNodes,
  onTaxonSelect,
  onTaxonToggle
}: TaxonTabProps) {
  return (
    <div className="space-y-8">
      {/* Taxon Search */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Search Taxons</Label>
          <div className="rounded-lg border bg-card p-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or taxid..."
                value={taxonSearchQuery}
                onChange={(e) => setTaxonSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Search Results */}
            {taxonSearchLoading && (
              <div className="text-xs text-muted-foreground py-2 mt-3">Searching...</div>
            )}
            {taxonSearchQuery && !taxonSearchLoading && taxonSearchResults.length > 0 && (
              <div className="border rounded-md bg-background p-2 space-y-2 max-h-48 overflow-y-auto mt-3">
                {taxonSearchResults.map((taxon) => (
                  <div
                    key={taxon.taxid}
                    onClick={() => onTaxonSelect(taxon)}
                    className="p-2 hover:bg-muted rounded cursor-pointer text-sm transition-colors"
                  >
                    <div className="font-medium">{taxon.scientific_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {taxon.rank} · {taxon.taxid}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Taxonomic Tree */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Browse Taxonomic Tree</Label>
          <p className="text-xs text-muted-foreground">
            The tree displays the children of <span className="font-bold text-primary">Eukaryota</span>. Click the expand icon to expand/collapse nodes. Click on a node name to select it.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <CompactTaxonomicTree
            selectedTaxids={selectedTaxids}
            onTaxonToggle={onTaxonToggle}
            expandedNodes={expandedTaxonNodes}
            onExpandedNodesChange={setExpandedTaxonNodes}
            maxDepth={5}
          />
        </div>
      </div>
    </div>
  )
}

