import { create } from 'zustand'

interface ShownTooltipsState {
  shownTooltips: Set<string>
  markAsShown: (key: string) => void
  isShown: (key: string) => boolean
  clear: () => void
}

export const useShownTooltipsStore = create<ShownTooltipsState>((set, get) => ({
  shownTooltips: new Set<string>(),

  markAsShown: (key: string) => {
    set((state) => {
      const newSet = new Set(state.shownTooltips)
      newSet.add(key)
      return { shownTooltips: newSet }
    })
  },

  isShown: (key: string) => {
    return get().shownTooltips.has(key)
  },

  clear: () => {
    set({ shownTooltips: new Set<string>() })
  },
}))

