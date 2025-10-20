"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, X, Package, HardDrive, Calendar, ChevronLeft, ChevronRight, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import * as Checkbox from "@radix-ui/react-checkbox"
import type { Annotation } from "@/lib/types"
import { downloadAnnotations } from "@/lib/api/annotations"

interface BulkDownloadBarProps {
  selectedAnnotations: Annotation[]
  onClearSelection: () => void
  onRemoveItem?: (id: string) => void
}

export function BulkDownloadBar({ selectedAnnotations, onClearSelection, onRemoveItem }: BulkDownloadBarProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [includeIndex, setIncludeIndex] = useState(true)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Calculate total size in GB
  const totalSize = selectedAnnotations.reduce((sum, annotation) => {
    const sizeInBytes = typeof annotation.indexed_file_info.file_size === 'number' 
      ? annotation.indexed_file_info.file_size 
      : 0
    return sum + sizeInBytes
  }, 0) / (1024 ** 3) // Convert bytes to GB

  // Split annotations into packages of up to 15GB
  const MAX_PACKAGE_SIZE_GB = 15
  const packages: Annotation[][] = []
  let currentPackage: Annotation[] = []
  let currentPackageSize = 0

  selectedAnnotations.forEach((annotation) => {
    const sizeInGB = (typeof annotation.indexed_file_info.file_size === 'number' 
      ? annotation.indexed_file_info.file_size 
      : 0) / (1024 ** 3)
    
    if (currentPackageSize + sizeInGB > MAX_PACKAGE_SIZE_GB && currentPackage.length > 0) {
      packages.push(currentPackage)
      currentPackage = [annotation]
      currentPackageSize = sizeInGB
    } else {
      currentPackage.push(annotation)
      currentPackageSize += sizeInGB
    }
  })
  
  if (currentPackage.length > 0) {
    packages.push(currentPackage)
  }

  // Count unique organisms and assemblies
  const uniqueOrganisms = new Set(selectedAnnotations.map(a => a.organism_name))
  const uniqueAssemblies = new Set(selectedAnnotations.map(a => a.assembly_name))

  // Pagination for dialog
  const totalPages = Math.ceil(selectedAnnotations.length / itemsPerPage)
  const paginatedAnnotations = selectedAnnotations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const [downloadStates, setDownloadStates] = useState<Map<string, 'idle' | 'downloading' | 'downloaded'>>(new Map())

  const handleDownload = async (packageAnnotations?: Annotation[], packageIndex?: number) => {
    const annotationsToDownload = packageAnnotations || selectedAnnotations
    const packageSize = annotationsToDownload.reduce((sum, annotation) => {
      const sizeInBytes = typeof annotation.indexed_file_info.file_size === 'number' 
        ? annotation.indexed_file_info.file_size 
        : 0
      return sum + sizeInBytes
    }, 0) / (1024 ** 3)
    const annotationIds = annotationsToDownload.map((a) => a.annotation_id)
    
    // Create a unique key for this download
    const downloadKey = packageIndex !== undefined ? `package-${packageIndex}` : 'all-selected'
    
    try {
      // Set downloading state
      setDownloadStates(prev => new Map(prev).set(downloadKey, 'downloading'))
      
      // Create filename based on package or selection
      const filename = packageIndex !== undefined 
        ? `annotations-package-${packageIndex + 1}.tar`
        : 'selected-annotations.tar'
      
      // Download the tar file
      const response = await downloadAnnotations(annotationIds as string[])
      
      // Create blob from response
      const blob = new Blob([response], { type: 'application/tar' })
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      // Set downloaded state
      setDownloadStates(prev => new Map(prev).set(downloadKey, 'downloaded'))
      
    } catch (error) {
      console.error("Error downloading annotations:", error)
      // Reset to idle state on error
      setDownloadStates(prev => new Map(prev).set(downloadKey, 'idle'))
    }
  }

  return (
    <>
      {/* Floating action bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 max-w-2xl">
        <div className="bg-primary text-primary-foreground rounded-lg shadow-lg border border-primary/20 px-6 py-4 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Package className="h-5 w-5" />
              <div className="absolute -top-1 -right-1 bg-primary-foreground text-primary text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {selectedAnnotations.length}
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm">
                Download Cart
              </div>
              <div className="text-xs opacity-90 flex items-center gap-1.5">
                <HardDrive className="h-3 w-3" />
                {selectedAnnotations.length} file{selectedAnnotations.length !== 1 ? "s" : ""} • ~{totalSize.toFixed(2)} GB
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-primary-foreground/20" />

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCurrentPage(1)
                setShowDialog(true)
              }}
              className="bg-background text-foreground hover:bg-background/90 font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Configure & Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="hover:bg-primary-foreground/10 text-primary-foreground"
              title="Clear cart"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Download configuration dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Download Annotation Package</DialogTitle>
            <DialogDescription>
              Configure your download package with {selectedAnnotations.length} annotation
              {selectedAnnotations.length !== 1 ? "s" : ""} from {uniqueOrganisms.size} organism
              {uniqueOrganisms.size !== 1 ? "s" : ""} and {uniqueAssemblies.size} assembl
              {uniqueAssemblies.size !== 1 ? "ies" : "y"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2">
            {/* Packages */}
            {packages.length > 1 && (
              <div>
                <Label className="text-sm font-medium mb-3 block">Download Packages</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Your selection has been split into {packages.length} packages (max 15GB each)
                </p>
                <div className="grid gap-3">
                  {packages.map((pkg, index) => {
                    const pkgSize = pkg.reduce((sum, a) => sum + (typeof a.indexed_file_info.file_size === 'number' ? a.indexed_file_info.file_size : 0), 0) / (1024 ** 3)
                    const downloadKey = `package-${index}`
                    const downloadState = downloadStates.get(downloadKey) || 'idle'
                    
                    return (
                      <div key={index} className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">Package {index + 1}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {pkg.length} file{pkg.length !== 1 ? 's' : ''} • {pkgSize.toFixed(2)} GB
                            </div>
                            {downloadState === 'downloaded' && (
                              <div className="text-xs text-green-600 mt-1">
                                ✓ Downloaded as annotations-package-{index + 1}.tar
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleDownload(pkg, index)}
                            disabled={downloadState === 'downloading'}
                            className="h-8"
                          >
                            {downloadState === 'downloading' ? (
                              <>
                                <div className="h-3 w-3 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Downloading...
                              </>
                            ) : downloadState === 'downloaded' ? (
                              <>
                                <Check className="h-3 w-3 mr-2" />
                                Downloaded
                              </>
                            ) : (
                              <>
                                <Download className="h-3 w-3 mr-2" />
                                Download
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Selected files preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Selected Files ({selectedAnnotations.length})</Label>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {paginatedAnnotations.map((annotation) => {
                  const sizeInMB = typeof annotation.indexed_file_info.file_size === 'number'
                    ? (annotation.indexed_file_info.file_size / (1024 ** 2)).toFixed(1)
                    : '0'
                  
                  return (
                    <div key={annotation.annotation_id} className="flex items-start justify-between text-sm py-2 group hover:bg-muted/50 -mx-2 px-2 rounded transition-colors">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Badge className="text-xs shrink-0 mt-0.5">
                          {annotation.source_file_info.database}
                        </Badge>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="font-medium text-sm italic truncate">
                            {annotation.organism_name}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span>{annotation.assembly_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 inline" />
                              <span>{new Date(annotation.source_file_info.release_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 ml-2 shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap mt-1">
                          {sizeInMB} MB
                        </span>
                        {onRemoveItem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onRemoveItem(annotation.annotation_id)
                            }}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Total package size: ~{totalSize.toFixed(2)} GB
              </div>
            </div>

            {/* Format info */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Archive Format</Label>
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="font-medium">TAR</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  All annotations will be packaged in a tar archive format.
                </p>
              </div>
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

          <DialogFooter className="border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            {packages.length === 1 && (
              <Button 
                onClick={() => handleDownload()}
                disabled={downloadStates.get('all-selected') === 'downloading'}
              >
                {downloadStates.get('all-selected') === 'downloading' ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Downloading...
                  </>
                ) : downloadStates.get('all-selected') === 'downloaded' ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Downloaded
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
