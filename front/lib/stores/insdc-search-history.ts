import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface INSDCSearchHistory {
  query: string
  fieldType: 'scientific_name' | 'taxid' | 'assembly_accession'
  matchType: 'organism' | 'taxon' // What was matched
  matchedName: string // Name of the matched organism/taxon
  matchedTaxId: string
  routerPath: string
  timestamp: number
}

interface INSDCSearchHistoryState {
  history: INSDCSearchHistory[]
  addToHistory: (item: Omit<INSDCSearchHistory, 'timestamp'>) => void
  clearHistory: () => void
  getRecentSearches: (limit?: number) => INSDCSearchHistory[]
}

export const useINSDCSearchHistoryStore = create<INSDCSearchHistoryState>()(
  persist(
    (set, get) => ({
      history: [],

      addToHistory: (item) => {
        set((state) => {
          const newItem: INSDCSearchHistory = {
            ...item,
            timestamp: Date.now()
          }

          // Remove duplicates (same query and matchedTaxId)
          const filteredHistory = state.history.filter(
            h => !(h.query === item.query && h.matchedTaxId === item.matchedTaxId)
          )

          // Add new item to the beginning and keep only last 10 (5 organism + 5 taxon max)
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
      name: 'insdc-search-history'
    }
  )
)

