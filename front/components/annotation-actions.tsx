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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Download, Eye, Activity, MoreVertical, FileText } from "lucide-react"
import { StreamIntervalDialog } from "@/components/stream-interval-dialog"
import { FileOverviewDialog } from "@/components/file-overview-dialog"
import type { Annotation } from "@/lib/types"

interface AnnotationActionsProps {
  annotation: Annotation
}

export function AnnotationActions({ annotation }: AnnotationActionsProps) {
  const [streamDialogOpen, setStreamDialogOpen] = useState(false)
  const [overviewDialogOpen, setOverviewDialogOpen] = useState(false)
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)

  const handleDownload = () => {
    // Mock download action
    console.log("Downloading:", annotation.fileName)
    setDownloadDialogOpen(true)
  }

  const handleViewInBrowser = () => {
    // Mock browser view action
    console.log("Opening in genome browser:", annotation.fileName)
    window.open(`https://genome-browser.example.com?file=${annotation.id}`, "_blank")
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
            <DropdownMenuItem onClick={() => setStreamDialogOpen(true)}>
              <Activity className="h-4 w-4 mr-2" />
              Stream Intervals
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleViewInBrowser}>
              <Eye className="h-4 w-4 mr-2" />
              View in Browser
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download TAR
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <StreamIntervalDialog annotation={annotation} open={streamDialogOpen} onOpenChange={setStreamDialogOpen} />

      <FileOverviewDialog annotation={annotation} open={overviewDialogOpen} onOpenChange={setOverviewDialogOpen} />

      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Annotation</DialogTitle>
            <DialogDescription>Preparing your download...</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-sm font-medium mb-2">File Details</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Filename:</span>
                  <span className="font-mono text-xs">{annotation.fileName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span>{annotation.fileSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>Format:</span>
                  <span>TAR.GZ</span>
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={() => setDownloadDialogOpen(false)}>
              <Download className="h-4 w-4 mr-2" />
              Start Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
