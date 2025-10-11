"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaxonRecord } from "@/lib/api/types"
import { getTaxonAncestors, getTaxonChildren } from "@/lib/api/taxons"
import { useEffect, useState } from "react"
import { Database, Network, Star } from "lucide-react"
import { TaxonomicTreeTable } from "./taxonomic-tree-table"
import { AssembliesList } from "./assemblies-list"
import { WikiSummary } from "./wiki-summary"

interface TaxonDetailViewProps {
  taxonDetails: TaxonRecord
  onAssembliesSelectionChange?: (accessions: string[]) => void
  onTaxonChange?: (taxid: string) => void
  onAssemblySelect?: (accession: string) => void
  onJBrowseChange?: (accession: string, annotationId?: string) => void
}

export function TaxonDetailView({ taxonDetails, onAssembliesSelectionChange, onTaxonChange, onAssemblySelect, onJBrowseChange }: TaxonDetailViewProps) {
  const [children, setChildren] = useState<TaxonRecord[]>([])
  const [ancestors, setAncestors] = useState<TaxonRecord[]>([])
  const [isTreeViewOpen, setIsTreeViewOpen] = useState(false)

  if (!taxonDetails) {
    return <div className="text-muted-foreground">Taxon not found</div>
  }

  //use useEffect to fetch the children
  useEffect(() => {
    const fetchChildren = async () => {
      const children = await getTaxonChildren(taxonDetails.taxid)
      setChildren(children.results)
    }
    const fetchAncestors = async () => {
      const ancestors = await getTaxonAncestors(taxonDetails.taxid)
      setAncestors(ancestors.results)
    }
    fetchChildren()
    fetchAncestors()
  }, [taxonDetails.taxid])

  return (
    <div className="space-y-6">
      <div>
        {/* Breadcrumb path with tree button */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold mb-2">{taxonDetails.scientific_name}</h2>
            <p className="text-lg text-muted-foreground italic">{taxonDetails.rank}</p>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Database className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium mb-1">NCBI TaxID</div>
                <div className="font-mono text-sm text-muted-foreground">{taxonDetails.taxid}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsTreeViewOpen(!isTreeViewOpen)}
            className="gap-2"
          >
            <Network className="h-4 w-4" />
            {isTreeViewOpen ? "Hide" : "Show"} Taxonomic Hierarchy
          </Button>
        </div>
      </div>

      {/* Wikipedia Summary */}
      <WikiSummary
        searchTerm={taxonDetails.scientific_name || ""}
        className="mb-6"
      />

      {/* Tree Table Modal */}
      <Dialog open={isTreeViewOpen} onOpenChange={setIsTreeViewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Taxonomic Hierarchy</DialogTitle>
          </DialogHeader>
          <TaxonomicTreeTable
            ancestors={ancestors}
            currentTaxon={taxonDetails}
            children={children}
            onTaxonClick={(taxid) => {
              setIsTreeViewOpen(false)
              onTaxonChange?.(taxid)
            }}
          />
        </DialogContent>
      </Dialog>

      <AssembliesList
        taxid={taxonDetails.taxid}
        onAssembliesSelectionChange={onAssembliesSelectionChange}
        onAssemblySelect={onAssemblySelect}
        onJBrowseChange={onJBrowseChange}
        view="taxon"
      />
    </div>
  )
}
