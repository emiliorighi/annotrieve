import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SearchHistory {
  query: string
  resultType: 'organism' | 'assembly' | 'taxon'
  resultName: string
  resultSubtitle: string
  annotationCount: number
  routerPath: string
  resultId?: string // Optional ID for setting filters (taxid or assembly_accession)
  timestamp: number
}

interface SearchHistoryState {
  history: SearchHistory[]
  addToHistory: (item: Omit<SearchHistory, 'timestamp'>) => void
  clearHistory: () => void
  getRecentSearches: (limit?: number) => SearchHistory[]
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set, get) => ({
      history: [],

      addToHistory: (item) => {
        set((state) => {
          const newItem: SearchHistory = {
            ...item,
            timestamp: Date.now()
          }

          // Remove duplicates (same routerPath)
          const filteredHistory = state.history.filter(
            h => h.routerPath !== item.routerPath
          )

          // Add new item to the beginning and keep only last 5
          const newHistory = [newItem, ...filteredHistory].slice(0, 3)

          return { history: newHistory }
        })
      },

      clearHistory: () => {
        set({ history: [] })
      },

      getRecentSearches: (limit = 3) => {
        const state = get()
        return state.history.slice(0, limit)
      }
    }),
    {
      name: 'search-history'
    }
  )
)

