"use client"

import { useUIStore } from "@/lib/stores/ui"
import { FileOverviewSidebar } from "@/components/file-overview-dialog"
import { TaxonomicTreeTable } from "@/components/taxonomic-tree-table"
import { AssembliesListTable } from "@/components/assemblies-list-table"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect } from "react"

export function RightSidebar() {
  const rightSidebar = useUIStore((state) => state.rightSidebar)
  const closeRightSidebar = useUIStore((state) => state.closeRightSidebar)
  const { isOpen, view, data } = rightSidebar

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeRightSidebar()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeRightSidebar])

  if (!isOpen || !view) return null

  const getTitle = () => {
    switch (view) {
      case "file-overview":
        return "Annotation Overview"
      case "taxonomic-tree":
        return "Taxonomic Tree"
      case "assemblies-list":
        return "Assemblies List"
      default:
        return "Details"
    }
  }

  // FileOverviewSidebar has its own overlay and structure, so handle it separately
  if (view === "file-overview" && data.annotation) {
    return (
      <FileOverviewSidebar
        annotation={data.annotation}
        open={isOpen}
        onOpenChange={(open) => !open && closeRightSidebar()}
      />
    )
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={closeRightSidebar}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-50 bg-background border-l shadow-lg",
          "transition-transform duration-300 ease-in-out",
          "flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ width: 'min(800px, 90vw)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0 bg-muted/30">
          <h2 className="text-lg font-semibold">{getTitle()}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeRightSidebar}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {view === "taxonomic-tree" && (
            <div className="p-4 h-full">
              <TaxonomicTreeTable
                rootTaxid={data.taxid || "2759"}
                selectedTaxid={data.taxid || null}
                showSearch={true}
                showRankFilter={true}
              />
            </div>
          )}

          {view === "assemblies-list" && (
            <div className="p-4 h-full">
              <AssembliesListTable taxid={data.taxid} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

