"use client"

import { CheckCircle2, FileCog, Layers, Shuffle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { SectionHeader } from "@/components/ui/section-header"

export function DataProcessingGuide() {
  return (
    <div className="container mx-auto px-4 py-12">
      <SectionHeader
        title="How Annotrieve processes data"
        description="We transform upstream GFF/GTF releases into fast, queryable formats for search and download."
        icon={FileCog}
        iconColor="text-blue-600"
        iconBgColor="bg-blue-500/10"
        align="center"
      />

      <div className="relative max-w-3xl mx-auto mt-10">
        {/* Vertical connector line */}
        <div className="absolute left-8 md:left-9 top-0 bottom-0 w-px bg-border/40 pointer-events-none" />

        <div className="flex flex-col gap-8">
          {/* Step 1 */}
          <div className="relative flex items-start gap-6">
            <div className="w-16 flex justify-center">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/20">
                <Shuffle className="h-5 w-5" />
              </div>
            </div>
            <Card className="flex-1 p-6 border-border/60 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold tracking-tight">Sort</h4>
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Step 1
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Each annotation file is sorted by genomic coordinates to enable
                efficient indexing and range queries.
              </p>
            </Card>
          </div>

          {/* Step 2 */}
          <div className="relative flex items-start gap-6">
            <div className="w-16 flex justify-center">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/20">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <Card className="flex-1 p-6 border-border/60 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold tracking-tight">bgzip compress</h4>
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Step 2
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                We compress sorted files using bgzip, preserving block
                boundaries for random access on large files.
              </p>
            </Card>
          </div>

          {/* Step 3 */}
          <div className="relative flex items-start gap-6">
            <div className="w-16 flex justify-center">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/20">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <Card className="flex-1 p-6 border-border/60 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold tracking-tight">CSI index</h4>
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Step 3
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                A CSI index is generated for each file so tools and our API can
                fetch precise regions instantly.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}


