"use client"

import { Card } from "@/components/ui/card"
import { FileText, GitBranch, Calculator, Zap, BarChart3, Database } from "lucide-react"

const computationSteps = [
  {
    icon: FileText,
    title: "Read GFF3 Files",
    description: "We stream compressed GFF3 files (.gz) directly from web sources, decompressing on-the-fly without downloading to disk. This allows us to process large genome annotation files efficiently.",
    details: ["Stream-based parsing", "Line-by-line processing", "Memory-efficient"]
  },
  {
    icon: GitBranch,
    title: "Categorize Genes",
    description: "Each gene is classified into exactly one category based on its biological features and relationships with child elements.",
    details: [
      "Pseudogene: Feature type is 'pseudogene'",
      "Coding: Has CDS segments or 'protein_coding' biotype",
      "Non-coding: Has exons but not pseudogene or coding"
    ]
  },
  {
    icon: Calculator,
    title: "Compute Lengths & Counts",
    description: "For each category, we calculate comprehensive statistics including gene counts, transcript metrics, and feature measurements.",
    details: [
      "Gene length: end - start + 1",
      "Transcript span: first exon start to last exon end",
      "Spliced length: sum of all exon lengths",
      "Introns: gaps between consecutive exons"
    ]
  },
  {
    icon: BarChart3,
    title: "Aggregate Statistics",
    description: "We accumulate totals and compute statistical measures during a single pass through the data, calculating means, medians, and per-gene averages.",
    details: [
      "Count genes, transcripts, and features",
      "Calculate min, max, mean, median lengths",
      "Group transcripts by type (mRNA, lncRNA, etc.)",
      "Compute exons per transcript ratios"
    ]
  },
  {
    icon: Zap,
    title: "Optimize Performance",
    description: "Our streaming approach processes files in a single pass, keeping only essential data in memory and avoiding expensive re-reads.",
    details: [
      "Single-pass processing",
      "Store only necessary coordinates",
      "Pre-accumulate category totals",
      "No full file loading"
    ]
  },
  {
    icon: Database,
    title: "Generate JSON Output",
    description: "Final statistics are assembled into a structured JSON format with three main categories, each containing detailed gene, transcript, and feature statistics.",
    details: [
      "coding_genes: protein-coding statistics",
      "non_coding_genes: non-coding RNA statistics",
      "pseudogenes: pseudogene statistics"
    ]
  }
]

export function StatsComputationGuide() {
  return (
    <div className="max-w-5xl mx-auto mt-12 mb-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-3">How Statistics Are Computed</h2>
        <p className="text-muted-foreground text-lg">
          From GFF3 files to comprehensive gene annotation statistics
        </p>
      </div>

      <div className="relative">
        {/* Vertical connecting line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-8">
          {computationSteps.map((step, index) => {
            const Icon = step.icon
            const isLast = index === computationSteps.length - 1

            return (
              <div key={index} className="relative flex gap-6 group">
                {/* Step icon circle */}
                <div className="relative z-0 flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 border-2 border-blue-500 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <Icon className="w-7 h-7 text-blue-500" />
                  </div>
                  {!isLast && <div className="absolute top-16 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-border" />}
                </div>

                {/* Step content */}
                <Card className="flex-1 p-6 group-hover:shadow-md transition-shadow">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-muted-foreground">STEP {index + 1}</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">{step.description}</p>

                    {step.details && step.details.length > 0 && (
                      <div className="space-y-2">
                        {step.details.map((detail, detailIndex) => (
                          <div key={detailIndex} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{detail}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      </div>

      {/* Additional info card */}
      <Card className="mt-12 p-6 bg-muted/30 border-dashed">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          Understanding the Output
        </h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Gene Categories:</strong> Each gene is classified as either a pseudogene, coding gene, or non-coding gene based on its features and biotype.
          </p>
          <p>
            <strong className="text-foreground">Transcript Types:</strong> Transcripts are grouped by type (e.g., mRNA, lncRNA, tRNA) with detailed statistics for each type including counts, lengths, and exon numbers.
          </p>
          <p>
            <strong className="text-foreground">Length Measurements:</strong> We calculate multiple length types: genomic span (full gene region), spliced length (exons only), and individual feature lengths (exons, introns, CDS).
          </p>
          <p>
            <strong className="text-foreground">Smart Optimization:</strong> When transcripts have exactly one exon, redundant length statistics are omitted to keep the output clean and efficient.
          </p>
        </div>
      </Card>
    </div>
  )
}

