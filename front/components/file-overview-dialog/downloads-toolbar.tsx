"use client"

import { Button } from "@/components/ui/button"
import { FileDown, ExternalLink, Download, Copy, Check, Eye, Activity } from "lucide-react"
import type { Annotation } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface DownloadsToolbarProps {
  annotation: Annotation
  onStreamDialogOpen: () => void
}

export function DownloadsToolbar({ annotation, onStreamDialogOpen }: DownloadsToolbarProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const router = useRouter()

  const copyToClipboard = async (text: string, urlId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedUrl(urlId)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = (url: string) => {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
      {/* Downloads Section */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <FileDown className="h-3.5 w-3.5" />
          Downloads
        </h5>
        <div className="flex flex-wrap gap-2">
          {/* Download Source File */}
          {(annotation.source_file_info as any)?.url_path && (
            <div className="flex items-center gap-0 border rounded-md bg-background shadow-sm hover:shadow transition-shadow">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 rounded-r-none"
                onClick={() => handleDownload((annotation.source_file_info as any).url_path)}
                title="Download source GFF3 file"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Source
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 rounded-l-none border-l hover:bg-muted"
                onClick={() => copyToClipboard((annotation.source_file_info as any).url_path, 'source')}
                title="Copy source file URL"
              >
                {copiedUrl === 'source' ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          )}
          
          {/* Download BGZipped File */}
          {annotation.indexed_file_info?.bgzipped_path && (
            <div className="flex items-center gap-0 border rounded-md bg-background shadow-sm hover:shadow transition-shadow">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 rounded-r-none"
                onClick={() => handleDownload(`https://genome.crg.es/annotrieve/files/${annotation.indexed_file_info.bgzipped_path}`)}
                title="Download BGZipped GFF3 file (compressed, tabix-indexed)"
              >
                <Download className="h-4 w-4 mr-1.5" />
                BGZip
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 rounded-l-none border-l hover:bg-muted"
                onClick={() => copyToClipboard(`https://genome.crg.es/annotrieve/files/${annotation.indexed_file_info.bgzipped_path}`, 'bgzip')}
                title="Copy BGZip file URL"
              >
                {copiedUrl === 'bgzip' ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          )}
          
          {/* Download CSI Index */}
          {annotation.indexed_file_info?.csi_path && (
            <div className="flex items-center gap-0 border rounded-md bg-background shadow-sm hover:shadow transition-shadow">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 rounded-r-none"
                onClick={() => handleDownload(`https://genome.crg.es/annotrieve/files/${annotation.indexed_file_info.csi_path}`)}
                title="Download CSI index file for tabix"
              >
                <Download className="h-4 w-4 mr-1.5" />
                CSI Index
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 rounded-l-none border-l hover:bg-muted"
                onClick={() => copyToClipboard(`https://genome.crg.es/annotrieve/files/${annotation.indexed_file_info.csi_path}`, 'csi')}
                title="Copy CSI index file URL"
              >
                {copiedUrl === 'csi' ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Browser Actions Section */}
      {(annotation as any).mapped_regions && Array.isArray((annotation as any).mapped_regions) && (annotation as any).mapped_regions.length > 0 && (
        <div className="border-t pt-4">
          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
            <ExternalLink className="h-3.5 w-3.5" />
            Browser Actions
          </h5>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              className="h-9 px-4 shadow-sm"
              onClick={() => {
                router.push(`/jbrowse/?accession=${annotation.assembly_accession}&annotationId=${annotation.annotation_id}`)
              }}
              title="Open in JBrowse genome browser"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              View in Browser
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 border-2 hover:bg-accent hover:border-accent"
              onClick={onStreamDialogOpen}
              title="Stream annotation data for a specific genomic interval"
            >
              <Activity className="h-4 w-4 mr-1.5" />
              Stream Interval
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

