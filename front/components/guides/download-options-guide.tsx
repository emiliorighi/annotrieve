"use client"

import { Link, Download, Archive } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SectionHeader } from "@/components/ui/section-header"

export function DownloadOptionsGuide() {
  return (
    <div className="container mx-auto px-4 py-12">
      <SectionHeader
        title="Two ways to download annotations"
        description="Choose between the original provider URL or the processed bgzip + CSI path from Annotrieve."
        icon={Download}
        iconColor="text-purple-600"
        iconBgColor="bg-purple-500/10"
        align="center"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <Link className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Source URL</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Download the original file directly from Ensembl, RefSeq, or GenBank for full fidelity and provenance.
          </p>
          <Button variant="outline" className="w-full" disabled>
            Example: provider.org/path/to/file.gff3
          </Button>
        </Card>

        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <Archive className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Processed bgzip + CSI</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Use the bgzipped and indexed copy for fast random access, region queries, and seamless tooling.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" className="w-full" disabled>
              example.s3/annotation.gff3.gz
            </Button>
            <Button variant="outline" className="w-full" disabled>
              example.s3/annotation.gff3.gz.csi
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}


