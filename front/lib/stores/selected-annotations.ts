import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Annotation } from '@/lib/types'

interface SelectedAnnotationsState {
  selectedIds: Set<string>
  selectedAnnotations: Annotation[]
  
  // Actions
  toggleSelection: (id: string) => void
  selectAll: (annotations: Annotation[]) => void
  selectMostRecent: (annotations: Annotation[]) => void
  clearSelection: () => void
  setSelectedAnnotations: (annotations: Annotation[]) => void
  
  // Computed values
  isSelected: (id: string) => boolean
  allSelected: (totalCount: number) => boolean
  someSelected: (totalCount: number) => boolean
}

export const useSelectedAnnotationsStore = create<SelectedAnnotationsState>()(
  persist(
    (set, get) => ({
      selectedIds: new Set<string>(),
      selectedAnnotations: [],

      toggleSelection: (id: string) => {
        set((state) => {
          const newSelectedIds = new Set(state.selectedIds)
          if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id)
          } else {
            newSelectedIds.add(id)
          }
          
          // Update selected annotations based on current annotations
          const currentAnnotations = get().selectedAnnotations
          const updatedSelectedAnnotations = currentAnnotations.filter(annotation => 
            newSelectedIds.has(annotation.annotation_id)
          )
          
          return {
            selectedIds: newSelectedIds,
            selectedAnnotations: updatedSelectedAnnotations
          }
        })
      },

      selectAll: (annotations: Annotation[]) => {
        const allIds = new Set(annotations.map(a => a.annotation_id))
        set({
          selectedIds: allIds,
          selectedAnnotations: annotations
        })
      },

      selectMostRecent: (annotations: Annotation[]) => {
        // Group by organism and select most recent (last modified) per organism
        const byOrganism = new Map<string, Annotation>()
        annotations.forEach((annotation) => {
          const existing = byOrganism.get(annotation.organism_name)
          if (!existing || new Date(annotation.source_file_info.last_modified) > new Date(existing.source_file_info.last_modified)) {
            byOrganism.set(annotation.organism_name, annotation)
          }
        })
        
        const mostRecentAnnotations = Array.from(byOrganism.values())
        const mostRecentIds = new Set(mostRecentAnnotations.map(a => a.annotation_id))
        
        set({
          selectedIds: mostRecentIds,
          selectedAnnotations: mostRecentAnnotations
        })
      },

      clearSelection: () => {
        set({
          selectedIds: new Set<string>(),
          selectedAnnotations: []
        })
      },

      setSelectedAnnotations: (annotations: Annotation[]) => {
        set((state) => {
          const selectedAnnotations = annotations.filter(annotation => 
            state.selectedIds.has(annotation.annotation_id)
          )
          return { selectedAnnotations }
        })
      },

      // Computed values
      isSelected: (id: string) => {
        return get().selectedIds.has(id)
      },

      allSelected: (totalCount: number) => {
        const state = get()
        return totalCount > 0 && state.selectedIds.size === totalCount
      },

      someSelected: (totalCount: number) => {
        const state = get()
        return state.selectedIds.size > 0 && state.selectedIds.size < totalCount
      }
    }),
    {
      name: 'selected-annotations-storage',
      // Only persist the selectedIds, not the full annotations (they change frequently)
      partialize: (state) => ({ selectedIds: Array.from(state.selectedIds) }),
      // Restore selectedIds from persisted array
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.selectedIds)) {
          state.selectedIds = new Set(state.selectedIds)
        }
      }
    }
  )
)
