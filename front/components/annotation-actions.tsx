"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, Eye, Activity, MoreVertical, FileText } from "lucide-react"
import { StreamIntervalDialog } from "@/components/stream-interval-dialog"
import { FileOverviewDialog } from "@/components/file-overview-dialog"
import type { Annotation } from "@/lib/types"

interface AnnotationActionsProps {
  annotation: Annotation
  onJBrowseChange?: (accession: string, annotationId: string) => void
}

export function AnnotationActions({ annotation, onJBrowseChange }: AnnotationActionsProps) {
  const [streamDialogOpen, setStreamDialogOpen] = useState(false)
  const [overviewDialogOpen, setOverviewDialogOpen] = useState(false)
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)

  const handleDownload = () => {
  // Create a temporary anchor element to trigger download
    const link = document.createElement('a')
    link.href = `https://genome.crg.es/annotrieve/files/${annotation.indexed_file_info.bgzipped_path}`
    link.download = '' // optional: set a filename if needed
    link.target = '_blank' // open in a new tab if preferred
    link.rel = 'noopener noreferrer'

    // Append to body and simulate click
    document.body.appendChild(link)
    link.click()

    // Clean up
    document.body.removeChild(link)
  }

  const handleViewInBrowser = () => {
    onJBrowseChange?.(annotation.assembly_accession, annotation.annotation_id)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setOverviewDialogOpen(true)}>
          <FileText className="h-4 w-4 mr-2" />
          Overview
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* <DropdownMenuItem onClick={() => setStreamDialogOpen(true)}>
              <Activity className="h-4 w-4 mr-2" />
              Stream Intervals
            </DropdownMenuItem> */}
            <DropdownMenuItem onClick={handleViewInBrowser}>
              <Eye className="h-4 w-4 mr-2" />
              View in Genome Browser
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* <StreamIntervalDialog annotation={annotation} open={streamDialogOpen} onOpenChange={setStreamDialogOpen} /> */}

      <FileOverviewDialog annotation={annotation} open={overviewDialogOpen} onOpenChange={setOverviewDialogOpen} />
    </>
  )
}
