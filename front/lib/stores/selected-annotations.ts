import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Annotation } from '@/lib/types'

interface SelectedAnnotationsState {
  // Store annotations in a Map for efficient lookup and persistence
  annotationsCart: Map<string, Annotation>
  
  // Actions
  toggleSelection: (annotation: Annotation) => void
  addToCart: (annotation: Annotation) => void
  removeFromCart: (id: string) => void
  selectAll: (annotations: Annotation[]) => void
  selectMostRecent: (annotations: Annotation[]) => void
  clearSelection: () => void
  
  // Computed values
  isSelected: (id: string) => boolean
  getSelectedAnnotations: () => Annotation[]
  getSelectedIds: () => Set<string>
  getSelectionCount: () => number
  allSelected: (annotations: Annotation[]) => boolean
  someSelected: (annotations: Annotation[]) => boolean
}

export const useSelectedAnnotationsStore = create<SelectedAnnotationsState>()(
  persist(
    (set, get) => ({
      annotationsCart: new Map<string, Annotation>(),

      toggleSelection: (annotation: Annotation) => {
        set((state) => {
          const newCart = new Map(state.annotationsCart)
          const id = annotation.annotation_id
          
          if (newCart.has(id)) {
            newCart.delete(id)
          } else {
            newCart.set(id, annotation)
          }
          
          return { annotationsCart: newCart }
        })
      },

      addToCart: (annotation: Annotation) => {
        set((state) => {
          const newCart = new Map(state.annotationsCart)
          newCart.set(annotation.annotation_id, annotation)
          return { annotationsCart: newCart }
        })
      },

      removeFromCart: (id: string) => {
        set((state) => {
          const newCart = new Map(state.annotationsCart)
          newCart.delete(id)
          return { annotationsCart: newCart }
        })
      },

      selectAll: (annotations: Annotation[]) => {
        set((state) => {
          const newCart = new Map(state.annotationsCart)
          annotations.forEach((annotation) => {
            newCart.set(annotation.annotation_id, annotation)
          })
          return { annotationsCart: newCart }
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
        
        set((state) => {
          const newCart = new Map(state.annotationsCart)
          byOrganism.forEach((annotation) => {
            newCart.set(annotation.annotation_id, annotation)
          })
          return { annotationsCart: newCart }
        })
      },

      clearSelection: () => {
        set({ annotationsCart: new Map() })
      },

      // Computed values
      isSelected: (id: string) => {
        return get().annotationsCart.has(id)
      },

      getSelectedAnnotations: () => {
        return Array.from(get().annotationsCart.values())
      },

      getSelectedIds: () => {
        return new Set(get().annotationsCart.keys())
      },

      getSelectionCount: () => {
        return get().annotationsCart.size
      },

      allSelected: (annotations: Annotation[]) => {
        const cart = get().annotationsCart
        if (annotations.length === 0) return false
        return annotations.every(annotation => cart.has(annotation.annotation_id))
      },

      someSelected: (annotations: Annotation[]) => {
        const cart = get().annotationsCart
        const selectedOnPage = annotations.filter(annotation => cart.has(annotation.annotation_id)).length
        return selectedOnPage > 0 && selectedOnPage < annotations.length
      }
    }),
    {
      name: 'selected-annotations-storage',
      // Persist the cart as an array of annotations
      partialize: (state) => ({ 
        annotationsCart: Array.from(state.annotationsCart.entries())
      }),
      // Restore cart from persisted array
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.annotationsCart)) {
          state.annotationsCart = new Map(state.annotationsCart as [string, Annotation][])
        }
      }
    }
  )
)
