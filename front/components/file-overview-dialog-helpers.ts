import type { LegendItem } from 'chart.js'

export type GeneCategory = 'coding_genes' | 'non_coding_genes' | 'pseudogenes'

export const GENE_CATEGORIES: GeneCategory[] = ['coding_genes', 'non_coding_genes', 'pseudogenes']

export const CATEGORY_COLORS: Record<GeneCategory, string> = {
  coding_genes: '#3b82f6',
  non_coding_genes: '#8b5cf6',
  pseudogenes: '#10b981',
}

export const CATEGORY_LABELS: Record<GeneCategory, string> = {
  coding_genes: 'Coding Genes',
  non_coding_genes: 'Non-coding Genes',
  pseudogenes: 'Pseudogenes',
}

export interface ChartLegendConfig {
  onCategoryToggle: (category: GeneCategory) => void
  categoryKeys: GeneCategory[]
  stats: any
}

export const createLegendConfig = ({ onCategoryToggle, categoryKeys, stats }: ChartLegendConfig) => ({
  display: true,
  position: 'bottom' as const,
  labels: {
    font: { size: 11 },
    usePointStyle: true,
    padding: 15,
  },
  onClick: (e: any, legendItem: LegendItem, legend: any) => {
    const label = legendItem.text
    const cat = categoryKeys.find(c => CATEGORY_LABELS[c] === label && stats[c])
    if (cat) {
      onCategoryToggle(cat)
    }
  },
})

export const createPieLegendConfig = ({ onCategoryToggle, categoryKeys, stats }: ChartLegendConfig) => ({
  position: 'bottom' as const,
  labels: {
    font: { size: 11 },
    usePointStyle: true,
    padding: 15,
    generateLabels: (chart: any) => {
      const data = chart.data
      if (data.labels.length && data.datasets.length) {
        return data.labels.map((label: string, i: number) => {
          const cat = categoryKeys.filter(c => stats[c])[i]
          const isHidden = !chart.data.datasets[0].data[i] || chart.data.datasets[0].data[i] === 0
          return {
            text: typeof label === 'string' ? label.split(' (')[0] : label,
            fillStyle: data.datasets[0].backgroundColor[i],
            hidden: isHidden,
            index: i,
            strokeStyle: data.datasets[0].backgroundColor[i],
            lineWidth: 1,
          }
        })
      }
      return []
    },
  },
  onClick: (e: any, legendItem: LegendItem, legend: any) => {
    const index = legendItem.index
    if (index === undefined) return
    const cat = categoryKeys.filter(c => stats[c])[index]
    if (cat) {
      onCategoryToggle(cat)
    }
  },
})

export interface ChartTooltipConfig {
  formatValue?: (value: number) => string
  formatLabel?: (label: string, value: number, datasetLabel: string) => string
}

export const createTooltipConfig = (config?: ChartTooltipConfig) => ({
  callbacks: {
    label: (context: any) => {
      if (config?.formatLabel) {
        return config.formatLabel(
          context.label,
          context.parsed.y || context.parsed,
          context.dataset.label
        )
      }
      if (config?.formatValue) {
        return `${context.dataset.label}: ${config.formatValue(context.parsed.y || context.parsed)}`
      }
      return `${context.dataset.label}: ${(context.parsed.y || context.parsed).toLocaleString()}`
    },
  },
})

export const createBarChartOptions = (
  legendConfig: any,
  tooltipConfig: any,
  additionalOptions: any = {}
) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: legendConfig,
    tooltip: tooltipConfig,
  },
  ...additionalOptions,
})

export const createPieChartOptions = (
  legendConfig: any,
  tooltipConfig: any,
  additionalOptions: any = {}
) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: legendConfig,
    tooltip: {
      ...tooltipConfig,
      filter: (tooltipItem: any) => tooltipItem.parsed > 0,
    },
  },
  ...additionalOptions,
})

export const getAllTranscriptTypes = (stats: any): string[] => {
  const transcriptTypesSet = new Set<string>()
  GENE_CATEGORIES.forEach(cat => {
    const types = stats[cat]?.transcripts?.types
    if (types) {
      Object.keys(types).forEach(type => transcriptTypesSet.add(type))
    }
  })
  return Array.from(transcriptTypesSet).sort()
}

export const calculateKPIs = (stats: any) => {
  const totalGenes = GENE_CATEGORIES.reduce((sum, cat) => sum + (stats[cat]?.count || 0), 0)
  const totalTranscripts = GENE_CATEGORIES.reduce((sum, cat) => sum + (stats[cat]?.transcripts?.count || 0), 0)
  
  // Calculate average exons per transcript
  let totalExons = 0
  let transcriptsWithExons = 0
  GENE_CATEGORIES.forEach(cat => {
    const exonsCount = stats[cat]?.features?.exons?.count || 0
    const transcriptsCount = stats[cat]?.transcripts?.count || 0
    if (transcriptsCount > 0) {
      totalExons += exonsCount
      transcriptsWithExons += transcriptsCount
    }
  })
  const avgExonsPerTranscript = transcriptsWithExons > 0 ? (totalExons / transcriptsWithExons).toFixed(2) : '0'
  
  // Calculate mean gene length (weighted average)
  let totalLength = 0
  let totalCount = 0
  GENE_CATEGORIES.forEach(cat => {
    const count = stats[cat]?.count || 0
    const meanLength = stats[cat]?.length_stats?.mean || 0
    if (count > 0 && meanLength > 0) {
      totalLength += meanLength * count
      totalCount += count
    }
  })
  const meanGeneLength = totalCount > 0 ? Math.round(totalLength / totalCount) : 0
  
  // Find longest and shortest genes
  let longestGene = 0
  let shortestGene = Infinity
  GENE_CATEGORIES.forEach(cat => {
    const max = stats[cat]?.length_stats?.max || 0
    const min = stats[cat]?.length_stats?.min || Infinity
    if (max > longestGene) longestGene = max
    if (min < shortestGene && min > 0) shortestGene = min
  })
  
  return {
    totalGenes,
    totalTranscripts,
    avgExonsPerTranscript,
    meanGeneLength,
    longestGene,
    shortestGene,
  }
}

export const getFilteredTranscriptTypes = (
  allTypes: string[],
  selectedTypes: Set<string>
): string[] => {
  return selectedTypes.size === 0 
    ? allTypes 
    : allTypes.filter(type => selectedTypes.has(type))
}

export const createCategoryDatasets = (
  stats: any,
  transcriptTypes: string[],
  dataExtractor: (cat: GeneCategory, type: string) => number,
  selectedCategories: Set<GeneCategory>
) => {
  return GENE_CATEGORIES
    .filter(cat => stats[cat]?.transcripts?.types)
    .map(cat => ({
      label: CATEGORY_LABELS[cat],
      data: transcriptTypes.map(type => dataExtractor(cat, type)),
      backgroundColor: CATEGORY_COLORS[cat],
      hidden: !selectedCategories.has(cat),
    }))
}

