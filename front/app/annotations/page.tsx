"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { AnnotationsList } from "@/components/annotations-list"
import { AnnotationsSidebarFilters } from "@/components/annotations-sidebar-filters"
import { ActiveFilters } from "@/components/active-filters"
import { Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/lib/stores/ui"
import { useAnnotationsFiltersStore } from "@/lib/stores/annotations-filters"

export default function AnnotationsPage() {
  // Check if we're in favorites view
  const searchParams = useSearchParams()
  const showFavs = searchParams?.get('showFavs') === 'true'
  
  // Use UI store for sidebar state
  const {
    isSidebarOpen,
    sidebarWidth,
    isResizing,
    isDesktop,
    toggleSidebar,
    setIsSidebarOpen,
    setSidebarWidth,
    setIsResizing,
    setIsDesktop,
  } = useUIStore()
  
  // Get active filters state
  const hasActiveFilters = useAnnotationsFiltersStore((state) => state.hasActiveFilters())
  
  const sidebarRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  
  // Hide sidebar when in favorites view
  useEffect(() => {
    if (showFavs && isSidebarOpen) {
      setIsSidebarOpen(false)
    }
  }, [showFavs, isSidebarOpen, setIsSidebarOpen])

  // Detect if we're on desktop (md breakpoint) and set initial sidebar state
  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth >= 768
      setIsDesktop(desktop)
      
      // On mobile, ensure sidebar is closed
      // On desktop, the persisted state from the store will be used
      if (!desktop) {
        setIsSidebarOpen(false)
      }
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [setIsDesktop, setIsSidebarOpen])

  // Handle window resize to constrain sidebar width
  useEffect(() => {
    const handleResize = () => {
      const maxWidth = window.innerWidth * 0.5
      if (sidebarWidth > maxWidth) {
        setSidebarWidth(Math.max(280, maxWidth))
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarWidth, setSidebarWidth])

  // Handle resize on mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return

    // Get the viewport width for calculation
    const viewportWidth = window.innerWidth
    const newWidth = e.clientX
    const maxWidth = viewportWidth * 0.5 // Max 50% of viewport
    const minWidth = 280 // Min width

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth)
    } else if (newWidth < minWidth) {
      setSidebarWidth(minWidth)
    } else if (newWidth > maxWidth) {
      setSidebarWidth(maxWidth)
    }
  }, [isResizing, setSidebarWidth])

  // Handle resize end
  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [setIsResizing])

  // Set up resize listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [setIsResizing])

  return (
    <div className="relative flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Overlay - visible when sidebar is open on mobile, hidden in favorites view */}
      {!showFavs && (
        <div
          className={`
            fixed inset-0 bg-black/50 z-40
            transition-opacity duration-300 ease-in-out
            ${isSidebarOpen && !isDesktop ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          `}
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Filters - hidden in favorites view */}
      {!showFavs && (
        <div
          ref={sidebarRef}
          className={`
            fixed md:relative
            top-0 left-0
            h-full
            z-50 md:z-auto
            bg-background
            flex-shrink-0
            overflow-hidden
            transition-all duration-300 ease-in-out
            ${isSidebarOpen 
              ? 'translate-x-0 opacity-100 border-r shadow-lg md:shadow-none' 
              : '-translate-x-full md:translate-x-0 md:opacity-0 md:pointer-events-none border-r-0 shadow-none'
            }
          `}
          style={{
            // Smooth width transitions - width animates from 0 to target width
            width: isDesktop 
              ? (isSidebarOpen ? `${sidebarWidth}px` : '0px')
              : (isSidebarOpen ? '320px' : '0px'),
            maxWidth: isDesktop && isSidebarOpen ? '50%' : (isDesktop ? '0px' : undefined),
          }}
        >
          {isSidebarOpen && (
            <div className="w-full h-full" style={{ width: isDesktop ? `${sidebarWidth}px` : '320px' }}>
              <AnnotationsSidebarFilters
                onClose={toggleSidebar}
              />
            </div>
          )}
        </div>
      )}

      {/* Resize Handle - Only visible on medium+ screens when sidebar is open, hidden in favorites view */}
      {!showFavs && (
        <div
          ref={resizeRef}
          onMouseDown={handleResizeStart}
          className={`
            w-1
            bg-border
            hover:bg-primary/30
            cursor-col-resize
            group
            relative
            flex-shrink-0
            transition-all duration-300 ease-in-out
            ${isResizing ? 'bg-primary' : ''}
            ${isSidebarOpen && isDesktop ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none w-0'}
          `}
          role="separator"
          aria-label="Resize sidebar"
          style={{
            touchAction: 'none'
          }}
        >
          {/* Elegant grabber button indicator - always visible */}
          <div
            className={`
              absolute
              top-1/2
              left-1/2
              -translate-x-1/2
              -translate-y-1/2
              w-6
              h-10
              rounded
              bg-background/95
              backdrop-blur-sm
              border
              border-border/60
              shadow-md
              flex
              items-center
              justify-center
              opacity-60
              group-hover:opacity-100
              transition-all
              pointer-events-none
              ${isResizing ? 'opacity-100 scale-105' : ''}
            `}
          >
            <div className="flex flex-col gap-0.5">
              <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
              <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
              <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-w-0 w-full">
        <div className="w-full flex flex-col h-full">
          {/* Active Filters - displayed at the top, hidden in favorites view */}
          {!showFavs && hasActiveFilters && (
            <div className="px-6 pt-6 pb-2 flex-shrink-0">
              <ActiveFilters />
            </div>
          )}
          
          {/* AnnotationsList - header aligns with sidebar header at pt-6 from top */}
          <AnnotationsList />
        </div>
      </div>
    </div>
  )
}
