"use client"

import { useUIStore } from "@/lib/stores/ui"
import { FileOverviewSidebar } from "./file-overview-dialog"
import { AssembliesListTable } from "./assemblies-list-table"
import { DownloadTsvPanel } from "./download-tsv-panel"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useCallback, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  clearAnnotationOverviewId,
  isAnnotationsListPath,
} from "@/lib/hooks/use-annotation-overview-url-sync"

function shellTitle(view: string): string {
  switch (view) {
    case "assemblies-list":
      return "Assemblies List"
    case "download-tsv":
      return "Download TSV report"
    default:
      return "Details"
  }
}

export function RightSidebar() {
  const rightSidebar = useUIStore((state) => state.rightSidebar)
  const closeRightSidebar = useUIStore((state) => state.closeRightSidebar)
  const { isOpen, view, data } = rightSidebar
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const closeFileOverview = useCallback(() => {
    // Optimistic close — do not wait for URL mirror (avoids reopen races).
    closeRightSidebar()
    if (isAnnotationsListPath(pathname)) {
      clearAnnotationOverviewId(router, searchParams)
    }
  }, [pathname, searchParams, router, closeRightSidebar])

  const handleClose = useCallback(() => {
    if (view === "file-overview") {
      closeFileOverview()
      return
    }
    closeRightSidebar()
  }, [view, closeFileOverview, closeRightSidebar])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose()
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen, handleClose])

  if (!isOpen || !view) return null

  // FileOverviewSidebar owns its own overlay/panel.
  if (view === "file-overview" && data.annotation) {
    return (
      <FileOverviewSidebar
        annotation={data.annotation}
        open={isOpen}
        onOpenChange={(open) => !open && closeFileOverview()}
      />
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 opacity-100 pointer-events-auto"
        onClick={handleClose}
      />

      <div
        className="fixed top-0 right-0 h-full z-50 bg-background border-l shadow-lg flex flex-col translate-x-0"
        style={{ width: "min(800px, 90vw)" }}
      >
        <div className="flex items-center justify-between p-3 border-b flex-shrink-0 bg-muted/30">
          <h2 className="text-lg font-semibold">{shellTitle(view)}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {view === "assemblies-list" && (
            <div className="p-3 h-full overflow-y-auto">
              <AssembliesListTable taxid={data.taxid} />
            </div>
          )}
          {view === "download-tsv" && (
            <DownloadTsvPanel
              totalAnnotations={data.totalAnnotations ?? 0}
              buildDownloadParams={data.buildDownloadParams ?? (() => ({}))}
            />
          )}
        </div>
      </div>
    </>
  )
}
