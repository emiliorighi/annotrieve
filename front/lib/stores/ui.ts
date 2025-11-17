import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RightSidebarView = "file-overview" | "taxonomic-tree" | "assemblies-list" | null

export type Theme = 'light' | 'dark'

interface UIState {
  // Theme state
  theme: Theme
  
  // Left sidebar state
  isSidebarOpen: boolean
  sidebarWidth: number
  isResizing: boolean
  isDesktop: boolean
  // Right sidebar state
  rightSidebar: {
    isOpen: boolean
    view: RightSidebarView
    data: {
      annotation?: any // For file-overview
      taxid?: string // For taxonomic-tree
      assemblyAccession?: string // For assemblies-list
    }
  }
  
  // INSDC Search Modal state
  insdcSearchModal: {
    isOpen: boolean
    initialQuery: string
  }
  
  // Actions
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setIsSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setIsResizing: (resizing: boolean) => void
  setIsDesktop: (desktop: boolean) => void
  openRightSidebar: (view: RightSidebarView, data?: any) => void
  closeRightSidebar: () => void
  setRightSidebarView: (view: RightSidebarView, data?: any) => void
  openInsdcSearchModal: (initialQuery?: string) => void
  closeInsdcSearchModal: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'dark', // Default to dark theme
      isSidebarOpen: true, // Default to open (will be adjusted based on desktop/mobile)
      sidebarWidth: 320,
      isResizing: false,
      isDesktop: false,
      rightSidebar: {
        isOpen: false,
        view: null,
        data: {}
      },
      insdcSearchModal: {
        isOpen: false,
        initialQuery: ""
      },
      
      // Actions
      setTheme: (theme: Theme) => {
        set({ theme })
      },
      toggleTheme: () => {
        const currentTheme = get().theme
        const newTheme = currentTheme === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      },
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
      
      openRightSidebar: (view, data = {}) => {
        set({ 
          rightSidebar: { 
            isOpen: true, 
            view, 
            data 
          } 
        })
      },
      
      closeRightSidebar: () => {
        set({ 
          rightSidebar: { 
            isOpen: false, 
            view: null, 
            data: {} 
          } 
        })
      },
      
      setRightSidebarView: (view, data = {}) => {
        set((state) => ({
          rightSidebar: {
            ...state.rightSidebar,
            view,
            data,
            isOpen: view !== null
          }
        }))
      },
      
      openInsdcSearchModal: (initialQuery = "") => {
        set({
          insdcSearchModal: {
            isOpen: true,
            initialQuery
          }
        })
      },
      
      closeInsdcSearchModal: () => {
        set({
          insdcSearchModal: {
            isOpen: false,
            initialQuery: ""
          }
        })
      },
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        // Persist theme, sidebar state and width
        // Note: isSidebarOpen is persisted, but on mobile it will be overridden
        theme: state.theme,
        isSidebarOpen: state.isSidebarOpen,
        sidebarWidth: state.sidebarWidth,
      }),
    }
  )
)
