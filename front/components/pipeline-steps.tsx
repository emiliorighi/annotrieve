import { Database, Download, ArrowDownUp, FileArchive, Layers, GitBranch, Map, CheckCircle2 } from "lucide-react"
import { Card } from "@/components/ui/card"

const pipelineSteps = [
  {
    title: "Retrieve GFF Filepaths",
    description:
      "Scan FTP sites from GenBank, RefSeq, and Ensembl to collect all available eukaryotic genome annotation files",
    icon: Database,
    sources: ["GenBank", "RefSeq", "Ensembl"],
  },
  {
    title: "Download GFF Files",
    description: "Download each identified GFF file from the respective FTP servers",
    icon: Download,
  },
  {
    title: "Sort Annotations",
    description: "Sort GFF entries by chromosome and position for efficient querying and indexing",
    icon: ArrowDownUp,
  },
  {
    title: "BGZip Compression",
    description: "Compress sorted files using BGZip (block gzip) to enable random access while maintaining compression",
    icon: FileArchive,
  },
  {
    title: "CSI Indexing",
    description: "Create CSI (Coordinate-Sorted Index) for fast region-based queries and streaming access",
    icon: Layers,
  },
  {
    title: "Index Taxonomic Data",
    description: "Collect and index related taxon information, building hierarchical relationships and lineages",
    icon: GitBranch,
  },
  {
    title: "Index Assemblies",
    description: "Extract and index assembly metadata including statistics, chromosomes, and accession information",
    icon: Database,
  },
  {
    title: "Map Region Names",
    description:
      "Map region names to chromosome identifiers for consistent querying across different naming conventions",
    icon: Map,
  },
]

export function DataPipelineTimeline() {
  return (
    <div className="max-w-5xl mx-auto mt-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-3">Data Integration Pipeline</h2>
        <p className="text-muted-foreground text-lg">
          How eukaryotic genome annotations are processed and indexed for fast, efficient access
        </p>
      </div>

      <div className="relative">
        {/* Vertical connecting line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-8">
          {pipelineSteps.map((step, index) => {
            const Icon = step.icon
            const isLast = index === pipelineSteps.length - 1

            return (
              <div key={index} className="relative flex gap-6 group">
                {/* Step number circle */}
                <div className="relative z-0 flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  {!isLast && <div className="absolute top-16 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-border" />}
                </div>

                {/* Step content */}
                <Card className="flex-1 p-6 group-hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-mono text-muted-foreground">STEP {index + 1}</span>
                        {index === pipelineSteps.length - 1 && <CheckCircle2 className="w-4 h-4 text-accent" />}
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{step.description}</p>

                      {step.sources && (
                        <div className="flex gap-2 mt-3">
                          {step.sources.map((source) => (
                            <span
                              key={source}
                              className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium"
                            >
                              {source}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
