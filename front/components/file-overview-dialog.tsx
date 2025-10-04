"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Annotation } from "@/lib/types"

interface FileOverviewDialogProps {
  annotation: Annotation
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FileOverviewDialog({ annotation, open, onOpenChange }: FileOverviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Annotation File Overview</DialogTitle>
          <DialogDescription>Detailed information about the GFF annotation file</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File info */}
          <div>
            <h4 className="text-sm font-semibold mb-3">File Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Filename</span>
                <span className="font-mono text-xs">{annotation.fileName}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Source</span>
                <Badge variant={annotation.source_file_info.source_database === "GenBank" ? "default" : "secondary"}>{annotation.source_file_info.source_database}</Badge>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">File Size</span>
                <span>{annotation.fileSize}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Last Modified</span>
                <span>{annotation.lastModified}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Format</span>
                <span className="font-mono">GFF3 (gzipped, tabix indexed)</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Organism info */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Organism & Assembly</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Organism</span>
                <span className="italic">{annotation.organism}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Assembly</span>
                <span className="font-mono">{annotation.assembly}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Assembly Accession</span>
                <span className="font-mono">{annotation.assemblyAccession}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Chromosomes</span>
                <span>{annotation.chromosomes}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Feature counts */}
          {/* <div>
            <h4 className="text-sm font-semibold mb-3">Feature Statistics</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary">{annotation.features.genes.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">Genes</div>
              </div>
              <div className="bg-secondary/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-secondary">
                  {annotation.features.transcripts.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Transcripts</div>
              </div>
              <div className="bg-accent/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-accent">{annotation.features.exons.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">Exons</div>
              </div>
            </div>
          </div> */}

          {/* Index info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Index Information</h4>
            <p className="text-xs text-muted-foreground">
              This file has been indexed with <span className="font-mono">tabix</span> using CSI indexing, enabling fast
              random access to genomic regions. You can stream specific intervals without downloading the entire file.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
