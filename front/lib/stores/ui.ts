import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // Sidebar state
  isSidebarOpen: boolean
  sidebarWidth: number
  isResizing: boolean
  isDesktop: boolean
  
  // Actions
  setIsSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setIsResizing: (resizing: boolean) => void
  setIsDesktop: (desktop: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      isSidebarOpen: true, // Default to open (will be adjusted based on desktop/mobile)
      sidebarWidth: 320,
      isResizing: false,
      isDesktop: false,
      
      // Actions
      setIsSidebarOpen: (open: boolean) => {
        set({ isSidebarOpen: open })
      },
      
      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }))
      },
      
      setSidebarWidth: (width: number) => {
        // Constrain width between 280 and 50% of viewport
        const maxWidth = typeof window !== 'undefined' ? window.innerWidth * 0.5 : 640
        const minWidth = 280
        const constrainedWidth = Math.max(minWidth, Math.min(width, maxWidth))
        set({ sidebarWidth: constrainedWidth })
      },
      
      setIsResizing: (resizing: boolean) => {
        set({ isResizing: resizing })
      },
      
      setIsDesktop: (desktop: boolean) => {
        set({ isDesktop: desktop })
        // Note: Sidebar open/close logic based on desktop/mobile is handled in the component
      },
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        // Persist sidebar state and width
        // Note: isSidebarOpen is persisted, but on mobile it will be overridden
        isSidebarOpen: state.isSidebarOpen,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
)
