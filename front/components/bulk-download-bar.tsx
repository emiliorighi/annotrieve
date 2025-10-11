"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, X, Package, HardDrive } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import * as RadioGroup from "@radix-ui/react-radio-group"
import * as Checkbox from "@radix-ui/react-checkbox"
import type { Annotation } from "@/lib/types"

interface BulkDownloadBarProps {
  selectedAnnotations: Annotation[]
  onClearSelection: () => void
}

export function BulkDownloadBar({ selectedAnnotations, onClearSelection }: BulkDownloadBarProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [format, setFormat] = useState<"tar.gz" | "zip">("tar.gz")
  const [includeIndex, setIncludeIndex] = useState(true)
  const [includeMetadata, setIncludeMetadata] = useState(true)

  // Calculate total size (mock calculation)
  const totalSize = selectedAnnotations.reduce((sum, annotation) => {
    const sizeMatch = annotation.indexed_file_info.file_size.toString().    match(/[\d.]+/)
    const size = sizeMatch ? Number.parseFloat(sizeMatch[0]) : 0
    return sum + size
  }, 0)

  const handleDownload = () => {
    // Mock download logic
    console.log("[v0] Downloading annotations:", {
      count: selectedAnnotations.length,
      format,
      includeIndex,
      includeMetadata,
      annotations: selectedAnnotations.map((a) => a.annotation_id),
    })

    // Simulate download
    alert(
      `Preparing download of ${selectedAnnotations.length} annotation files (${totalSize.toFixed(1)} GB)\n\nFormat: ${format}\nInclude indices: ${includeIndex}\nInclude metadata: ${includeMetadata}`,
    )

    setShowDialog(false)
  }

  return (
    <>
      {/* Floating action bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
        <div className="bg-primary text-primary-foreground rounded-lg shadow-lg border border-primary/20 px-6 py-4 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5" />
            <div>
              <div className="font-semibold text-sm">
                {selectedAnnotations.length} annotation{selectedAnnotations.length !== 1 ? "s" : ""} selected
              </div>
              <div className="text-xs opacity-90 flex items-center gap-1.5">
                <HardDrive className="h-3 w-3" />
                Total size: ~{totalSize.toFixed(1)} GB
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-primary-foreground/20" />

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDialog(true)}
              className="bg-background text-foreground hover:bg-background/90"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Package
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="hover:bg-primary-foreground/10 text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Download configuration dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Download Annotation Package</DialogTitle>
            <DialogDescription>
              Configure your download package with {selectedAnnotations.length} selected annotation
              {selectedAnnotations.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Selected files preview */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Selected Files</Label>
              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                {selectedAnnotations.map((annotation) => (
                  <div key={annotation.annotation_id} className="flex items-center justify-between text-sm py-1.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge className="text-xs">
                        {annotation.source_file_info.database}
                      </Badge>
                      <span className="font-mono text-xs truncate">{annotation.annotation_id}</span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">{annotation.indexed_file_info.file_size}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Total package size: ~{totalSize.toFixed(1)} GB
              </div>
            </div>

            {/* Format selection */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Archive Format</Label>
              <RadioGroup.Root value={format} onValueChange={(value: any) => setFormat(value)} className="space-y-2">
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroup.Item value="tar.gz" id="tar" className="w-4 h-4 rounded-full border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <Label htmlFor="tar" className="flex-1 cursor-pointer">
                    <div className="font-medium">TAR.GZ</div>
                    <div className="text-xs text-muted-foreground">Recommended for Unix/Linux systems</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroup.Item value="zip" id="zip" className="w-4 h-4 rounded-full border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <Label htmlFor="zip" className="flex-1 cursor-pointer">
                    <div className="font-medium">ZIP</div>
                    <div className="text-xs text-muted-foreground">Better compatibility with Windows</div>
                  </Label>
                </div>
              </RadioGroup.Root>
            </div>

            {/* Additional options */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Additional Options</Label>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 border rounded-lg p-3">
                  <Checkbox.Root
                    id="index"
                    checked={includeIndex}
                    onCheckedChange={(checked) => setIncludeIndex(!!checked)}
                    className="w-4 h-4 rounded border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary flex items-center justify-center"
                  >
                    <Checkbox.Indicator className="text-primary-foreground">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <Label htmlFor="index" className="flex-1 cursor-pointer leading-relaxed">
                    <div className="font-medium">Include CSI index files</div>
                    <div className="text-xs text-muted-foreground">
                      Include .csi index files for fast region queries (recommended)
                    </div>
                  </Label>
                </div>
                <div className="flex items-start space-x-3 border rounded-lg p-3">
                  <Checkbox.Root
                    id="metadata"
                    checked={includeMetadata}
                    onCheckedChange={(checked) => setIncludeMetadata(!!checked)}
                    className="w-4 h-4 rounded border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary flex items-center justify-center"
                  >
                    <Checkbox.Indicator className="text-primary-foreground">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <Label htmlFor="metadata" className="flex-1 cursor-pointer leading-relaxed">
                    <div className="font-medium">Include metadata JSON</div>
                    <div className="text-xs text-muted-foreground">
                      Include assembly and annotation metadata in JSON format
                    </div>
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
