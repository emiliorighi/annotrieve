"use client"

import { Code, Layers, Workflow } from "lucide-react"

interface GeneStats {
  total_count: number
  mean_count: number
  median_count: number
  mean_length: number
  median_length: number
}

interface AnnotationStats {
  annotations: {
    total_count: number
    related_organisms_count: number
    related_assemblies_count: number
  }
  genes: {
    coding_genes?: GeneStats
    non_coding_genes?: GeneStats
    pseudogenes?: GeneStats
  }
  transcripts: {
    [key: string]: any
  }
  features: {
    [key: string]: any
  }
}

interface GeneCountCompactChartProps {
  stats: AnnotationStats | null
}

// Gene category styling map
const geneCategoryStyles = {
  coding_genes: {
    icon: Code,
    label: "Avg Coding Genes Count",
    iconColor: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/50",
    hoverBorderColor: "hover:border-primary/50"
  },
  non_coding_genes: {
    icon: Layers,
    label: "Avg Non-coding Genes Count",
    iconColor: "text-secondary",
    bgColor: "bg-secondary/10",
    borderColor: "border-secondary/50",
    hoverBorderColor: "hover:border-secondary/50"
  },
  pseudogenes: {
    icon: Workflow,
    label: "Avg Pseudogenes Count",
    iconColor: "text-accent",
    bgColor: "bg-accent/10",
    borderColor: "border-accent/50",
    hoverBorderColor: "hover:border-accent/50"
  }
} as const

type GeneCategoryKey = keyof typeof geneCategoryStyles

export function GeneCountCompactChart({ stats }: GeneCountCompactChartProps) {

  if (!stats || !stats.genes) {
    return null
  }

  return (
    <div className="flex gap-4">
      {Object.entries(stats.genes).map(([key, geneStats]) => {
        const categoryKey = key as GeneCategoryKey
        const style = geneCategoryStyles[categoryKey]
        
        if (!style || !geneStats) return null
        
        const Icon = style.icon

        return (
          <div 
            key={key}
            className={`text-left rounded-lg p-3 transition-all border-2 min-w-[140px] ${style.bgColor} border-transparent ${style.hoverBorderColor} hover:shadow-sm`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className={`h-3.5 w-3.5 ${style.iconColor}`} />
              <h5 className={`text-xs font-semibold ${style.iconColor}`}>
                {style.label.replace(' Genes', '')}
              </h5>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="font-mono font-semibold">
                  {geneStats.mean_count?.toLocaleString() || "0"}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

