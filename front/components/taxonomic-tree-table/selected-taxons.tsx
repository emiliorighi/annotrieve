'use client'

import { useTaxonomicTreeStore } from '@/lib/stores/taxonomic-tree'
import { useAnnotationsFiltersStore } from '@/lib/stores/annotations-filters'
import { useUIStore } from '@/lib/stores/ui'
import { SelectedEntity, taxonToEntity } from './selected-entity'

export function SelectedTaxons() {
  const closeRightSidebar = useUIStore((state) => state.closeRightSidebar)
  const setSelectedTaxons = useAnnotationsFiltersStore((state) => state.setSelectedTaxons)
  
  const {
    selectedNodes,
    selectedTaxonsData,
    clearSelection,
    removeSelected
  } = useTaxonomicTreeStore()

  const handleSeeAnnotations = () => {
    const taxonsArray = Array.from(selectedTaxonsData.values())
    setSelectedTaxons(taxonsArray)
    closeRightSidebar()
  }

  const entities = Array.from(selectedTaxonsData.values()).map(taxonToEntity)

  return (
    <SelectedEntity
      title="Selected Taxons"
      entities={entities}
      onClear={clearSelection}
      onRemove={removeSelected}
      onAction={handleSeeAnnotations}
      actionLabel="View Annotations"
    />
  )
}

