"use client"

import { useState, Fragment } from "react"
import { Card, Button, Badge } from "@/components/ui"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bar } from 'react-chartjs-2'
import { ChevronDown, BarChart3 } from "lucide-react"
import type { AnnotationRecord } from "@/lib/api/types"

type Annotation = AnnotationRecord & {
    features_summary?: {
        biotypes?: string[]
        types?: string[]
        attribute_keys?: string[]
        root_type_counts?: Record<string, number>
    }
    features_statistics?: any
}

function findOverlappingItems(annotations: Annotation[], key: keyof NonNullable<Annotation['features_summary']>): string[] {
    if (annotations.length === 0) return []
    const first = annotations[0]?.features_summary?.[key] as string[] | undefined
    if (!first) return []
    const firstItems = new Set(first)
    const overlapping = Array.from(firstItems).filter(item =>
        annotations.every(ann => {
            const list = ann.features_summary?.[key] as string[] | undefined
            return Array.isArray(list) && list.includes(item)
        })
    )
    return overlapping.sort()
}

function findOverlappingRootTypes(annotations: Annotation[]): string[] {
    if (annotations.length === 0) return []
    const first = annotations[0]?.features_summary?.root_type_counts
    if (!first) return []
    const firstKeys = new Set(Object.keys(first))
    const overlapping = Array.from(firstKeys).filter(key =>
        annotations.every(ann => key in (ann.features_summary?.root_type_counts || {}))
    )
    return overlapping.sort()
}

function OverlapCard({ title, items, totalAnnotations }: { title: string; items: string[]; totalAnnotations: number }) {
    const [expanded, setExpanded] = useState(false)
    const displayItems = expanded ? items : items.slice(0, 10)
    const hasMore = items.length > 10

    return (
        <Card className="p-3 bg-muted/30">
            <div className="mb-2">
                <h5 className="text-sm font-semibold text-foreground mb-0.5">{title}</h5>
                <p className="text-[10px] text-muted-foreground">
                    {items.length} item{items.length !== 1 ? 's' : ''} in all {totalAnnotations} annotation{totalAnnotations !== 1 ? 's' : ''}
                </p>
            </div>
            {items.length === 0 ? (
                <div className="text-xs text-muted-foreground italic py-1">No common items found</div>
            ) : (
                <>
                    <div className="flex flex-wrap gap-1">
                        {displayItems.map((item, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                {item}
                            </Badge>
                        ))}
                    </div>
                    {hasMore && (
                        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="mt-2 h-6 text-[10px]">
                            {expanded ? 'Show Less' : `Show ${items.length - 10} More`}
                        </Button>
                    )}
                </>
            )}
        </Card>
    )
}

function GroupedGeneComparisonChart({
    geneData,
    hasCodingGenes,
    hasNonCodingGenes,
    hasPseudogenes,
    organismLabelMap
}: {
    geneData: any[]
    hasCodingGenes: boolean
    hasNonCodingGenes: boolean
    hasPseudogenes: boolean
    organismLabelMap: Record<string, string>
}) {
    const [metricType, setMetricType] = useState<'count' | 'mean_length' | 'median_length'>('count')
    const labels: string[] = []
    if (hasCodingGenes) labels.push('Coding Genes')
    if (hasPseudogenes) labels.push('Pseudogenes')
    if (hasNonCodingGenes) labels.push('Non-coding Genes')
    const colors = ['#3b82f6', '#f97316', '#a855f7', '#10b981', '#ef4444', '#06b6d4', '#84cc16', '#6366f1', '#ec4899', '#f59e0b', '#94a3b8']
    const datasets = geneData.map((data, idx) => {
        const dataPoints: number[] = []
        if (metricType === 'count') {
            if (hasCodingGenes) dataPoints.push(data.codingGenes?.count || 0)
            if (hasPseudogenes) dataPoints.push(data.pseudogenes?.count || 0)
            if (hasNonCodingGenes) dataPoints.push(data.nonCodingGenes?.count || 0)
        } else if (metricType === 'mean_length') {
            if (hasCodingGenes) dataPoints.push(data.codingGenes?.length_stats?.mean || 0)
            if (hasPseudogenes) dataPoints.push(data.pseudogenes?.length_stats?.mean || 0)
            if (hasNonCodingGenes) dataPoints.push(data.nonCodingGenes?.length_stats?.mean || 0)
        } else {
            if (hasCodingGenes) dataPoints.push(data.codingGenes?.length_stats?.median || 0)
            if (hasPseudogenes) dataPoints.push(data.pseudogenes?.length_stats?.median || 0)
            if (hasNonCodingGenes) dataPoints.push(data.nonCodingGenes?.length_stats?.median || 0)
        }
        return {
            label: organismLabelMap[data.annotation.annotation_id],
            data: dataPoints,
            backgroundColor: colors[idx % colors.length],
            borderColor: colors[idx % colors.length],
            borderWidth: 1,
        }
    })
    const chartData = { labels, datasets }
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'bottom' as const, labels: { color: '#64748b', font: { size: 11 } } },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff', borderColor: '#374151', borderWidth: 1,
                callbacks: {
                    label: (context: any) => {
                        const value = context.parsed.y.toLocaleString()
                        const suffix = metricType === 'count' ? '' : ' bp'
                        return `${context.dataset.label}: ${value}${suffix}`
                    }
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 12 } } },
            y: { beginAtZero: true, grid: { display: false }, ticks: { color: '#64748b', font: { size: 12 }, callback: (v: any) => v.toLocaleString() } }
        }
    }
    return (
        <Card className="p-4 flex-shrink-0">
            <div className="mb-3">
                <h4 className="font-semibold text-base text-foreground mb-1">Gene Category Comparison</h4>
                <p className="text-xs text-muted-foreground mb-3">Compare gene metrics across different categories.</p>
                <Select value={metricType} onValueChange={(v: any) => setMetricType(v)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="count">Gene Count</SelectItem>
                        <SelectItem value="mean_length">Mean Length</SelectItem>
                        <SelectItem value="median_length">Median Length</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="h-[300px]">
                <Bar data={chartData} options={options} />
            </div>
        </Card>
    )
}

function TranscriptTypeStackedBarChart({
    transcriptData,
    hasCodingGenes,
    hasNonCodingGenes,
    hasPseudogenes,
    organismLabelMap
}: {
    transcriptData: any[]
    hasCodingGenes: boolean
    hasNonCodingGenes: boolean
    hasPseudogenes: boolean
    organismLabelMap: Record<string, string>
}) {
    const getInitialCategory = () => (hasCodingGenes ? 'coding' : hasPseudogenes ? 'pseudogenes' : 'nonCoding')
    const [geneCategory, setGeneCategory] = useState<'coding' | 'pseudogenes' | 'nonCoding'>(getInitialCategory())
    const geneKeyMap = { coding: 'codingTranscriptsTypes', pseudogenes: 'pseudogenesTranscriptsTypes', nonCoding: 'nonCodingTranscriptsTypes' } as const
    const geneKey = geneKeyMap[geneCategory]
    const transcriptTypesSet = new Set<string>()
    transcriptData.forEach(d => { const t = d[geneKey]; if (t) Object.keys(t).forEach(tp => transcriptTypesSet.add(tp)) })
    const types = Array.from(transcriptTypesSet).sort()
    if (types.length === 0) {
        return (
            <Card className="p-4 flex-shrink-0">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {hasCodingGenes && (<Button variant={geneCategory === 'coding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('coding')} className="h-7 text-xs">Coding</Button>)}
                    {hasPseudogenes && (<Button variant={geneCategory === 'pseudogenes' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('pseudogenes')} className="h-7 text-xs">Pseudogenes</Button>)}
                    {hasNonCodingGenes && (<Button variant={geneCategory === 'nonCoding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('nonCoding')} className="h-7 text-xs">Non-coding</Button>)}
                </div>
                <div className="flex items-center justify-center h-[200px]"><p className="text-xs text-muted-foreground italic">No transcript type data available</p></div>
            </Card>
        )
    }
    const typeColors = ['#3b82f6', '#f97316', '#a855f7', '#10b981', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#6366f1', '#f43f5e', '#84cc16', '#0ea5e9', '#f59e0b']
    const labels = transcriptData.map(d => organismLabelMap[d.annotation.annotation_id])
    const datasets = types.map((type, idx) => ({
        label: type,
        data: transcriptData.map(d => d[geneKey]?.[type]?.count || 0),
        backgroundColor: typeColors[idx % typeColors.length],
        borderColor: typeColors[idx % typeColors.length],
        borderWidth: 1,
    }))
    const chartData = { labels, datasets }
    const options = {
        indexAxis: 'y' as const, responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: true, position: 'right' as const, labels: { color: '#64748b', font: { size: 10 }, boxWidth: 12, padding: 8 } },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff', borderColor: '#374151', borderWidth: 1,
                callbacks: { label: (context: any) => `${context.dataset.label}: ${context.parsed.x.toLocaleString()} transcripts` }
            }
        },
        scales: {
            x: { stacked: true, beginAtZero: true, ticks: { color: '#64748b', font: { size: 10 }, callback: (v: any) => v.toLocaleString() }, grid: { display: true, color: '#e2e8f0' } },
            y: { stacked: true, ticks: { color: '#64748b', font: { size: 11 } }, grid: { display: false } }
        }
    }
    return (
        <Card className="p-4 flex-shrink-0">
            <div className="mb-3">
                <h4 className="font-semibold text-base text-foreground mb-1">Transcript Type Distribution - Stacked</h4>
                <p className="text-xs text-muted-foreground mb-3">Compare transcript count and composition across annotations.</p>
                <div className="flex items-center gap-2 flex-wrap">
                    {hasCodingGenes && (<Button variant={geneCategory === 'coding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('coding')} className="h-7 text-xs">Coding</Button>)}
                    {hasPseudogenes && (<Button variant={geneCategory === 'pseudogenes' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('pseudogenes')} className="h-7 text-xs">Pseudogenes</Button>)}
                    {hasNonCodingGenes && (<Button variant={geneCategory === 'nonCoding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('nonCoding')} className="h-7 text-xs">Non-coding</Button>)}
                </div>
            </div>
            <div className="h-[300px]"><Bar data={chartData} options={options} /></div>
        </Card>
    )
}

function TranscriptTypeHeatmap({
    transcriptData,
    hasCodingGenes,
    hasNonCodingGenes,
    hasPseudogenes,
    organismLabelMap
}: {
    transcriptData: any[]
    hasCodingGenes: boolean
    hasNonCodingGenes: boolean
    hasPseudogenes: boolean
    organismLabelMap: Record<string, string>
}) {
    const getInitialCategory = () => (hasCodingGenes ? 'coding' : hasPseudogenes ? 'pseudogenes' : 'nonCoding')
    const [geneCategory, setGeneCategory] = useState<'coding' | 'pseudogenes' | 'nonCoding'>(getInitialCategory())
    const [metricField, setMetricField] = useState<'count' | 'mean_length' | 'per_gene' | 'median_length' | 'exons_per_transcript' | 'spliced_mean_length' | 'spliced_median_length' | 'exon_mean_length' | 'exon_median_length'>('count')
    const geneKeyMap = { coding: 'codingTranscriptsTypes', pseudogenes: 'pseudogenesTranscriptsTypes', nonCoding: 'nonCodingTranscriptsTypes' } as const
    const geneKey = geneKeyMap[geneCategory]
    const transcriptTypesSet = new Set<string>()
    transcriptData.forEach(d => { const t = d[geneKey]; if (t) Object.keys(t).forEach(tp => transcriptTypesSet.add(tp)) })
    const types = Array.from(transcriptTypesSet).sort()
    if (types.length === 0) {
        return (
            <Card className="p-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {hasCodingGenes && <Button variant={geneCategory === 'coding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('coding')} className="h-7 text-xs">Coding</Button>}
                        {hasPseudogenes && <Button variant={geneCategory === 'pseudogenes' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('pseudogenes')} className="h-7 text-xs">Pseudogenes</Button>}
                        {hasNonCodingGenes && <Button variant={geneCategory === 'nonCoding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('nonCoding')} className="h-7 text-xs">Non-coding</Button>}
                    </div>
                    <Select value={metricField} onValueChange={(v: any) => setMetricField(v)}>
                        <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="count">Count</SelectItem>
                            <SelectItem value="mean_length">Mean Length</SelectItem>
                            <SelectItem value="per_gene">Per Gene</SelectItem>
                            <SelectItem value="median_length">Median Length</SelectItem>
                            <SelectItem value="exons_per_transcript">Exons per Transcript</SelectItem>
                            <SelectItem value="spliced_mean_length">Spliced Mean Length</SelectItem>
                            <SelectItem value="spliced_median_length">Spliced Median Length</SelectItem>
                            <SelectItem value="exon_mean_length">Exon Mean Length</SelectItem>
                            <SelectItem value="exon_median_length">Exon Median Length</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center justify-center h-[200px]"><p className="text-xs text-muted-foreground italic">No transcript type data available</p></div>
            </Card>
        )
    }
    const allValues: number[] = []
    transcriptData.forEach(d => {
        types.forEach(t => {
            const td = d[geneKey]?.[t]
            if (td) {
                if (metricField === 'count') allValues.push(td.count || 0)
                else if (metricField === 'mean_length') allValues.push(td.length_stats?.mean || 0)
                else if (metricField === 'per_gene') allValues.push(td.per_gene || 0)
                else if (metricField === 'median_length') allValues.push(td.length_stats?.median || 0)
                else if (metricField === 'exons_per_transcript') allValues.push(td.exons_per_transcript || 0)
                else if (metricField === 'spliced_mean_length') allValues.push(td.spliced_length_stats?.mean || 0)
                else if (metricField === 'spliced_median_length') allValues.push(td.spliced_length_stats?.median || 0)
                else if (metricField === 'exon_mean_length') allValues.push(td.exon_length_stats?.mean || 0)
                else if (metricField === 'exon_median_length') allValues.push(td.exon_length_stats?.median || 0)
            }
        })
    })
    const maxValue = Math.max(...allValues, 1)
    const getHeatmapColor = (value: number) => {
        const intensity = value / maxValue
        const r = Math.floor(219 + intensity * (30 - 219))
        const g = Math.floor(234 + intensity * (64 - 234))
        const b = Math.floor(254 + intensity * (175 - 254))
        return `rgb(${r}, ${g}, ${b})`
    }
    return (
        <Card className="p-4 flex-shrink-0">
            <div className="mb-3">
                <h4 className="font-semibold text-base text-foreground mb-1">Transcript Type Heatmap</h4>
                <p className="text-xs text-muted-foreground mb-3">Detailed matrix view of transcript types. Color intensity represents the selected metric.</p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {hasCodingGenes && <Button variant={geneCategory === 'coding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('coding')} className="h-7 text-xs">Coding</Button>}
                        {hasPseudogenes && <Button variant={geneCategory === 'pseudogenes' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('pseudogenes')} className="h-7 text-xs">Pseudogenes</Button>}
                        {hasNonCodingGenes && <Button variant={geneCategory === 'nonCoding' ? 'default' : 'outline'} size="sm" onClick={() => setGeneCategory('nonCoding')} className="h-7 text-xs">Non-coding</Button>}
                    </div>
                    <Select value={metricField} onValueChange={(v: any) => setMetricField(v)}>
                        <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="count">Count</SelectItem>
                            <SelectItem value="mean_length">Mean Length</SelectItem>
                            <SelectItem value="per_gene">Per Gene</SelectItem>
                            <SelectItem value="median_length">Median Length</SelectItem>
                            <SelectItem value="exons_per_transcript">Exons per Transcript</SelectItem>
                            <SelectItem value="spliced_mean_length">Spliced Mean Length</SelectItem>
                            <SelectItem value="spliced_median_length">Spliced Median Length</SelectItem>
                            <SelectItem value="exon_mean_length">Exon Mean Length</SelectItem>
                            <SelectItem value="exon_median_length">Exon Median Length</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                    <div className="grid" style={{ gridTemplateColumns: `180px repeat(${types.length}, minmax(60px, 1fr))` }}>
                        <div className="text-xs font-semibold text-muted-foreground p-2">Annotation</div>
                        {types.map(type => (
                            <div key={type} className="text-[10px] font-medium text-muted-foreground p-2 text-center truncate">{type}</div>
                        ))}
                        {transcriptData.map((data, rowIdx) => (
                            <Fragment key={`row-${rowIdx}`}>
                                <div key={`row-${rowIdx}-label`} className="text-xs font-medium p-2 border-t border-border whitespace-nowrap">
                                    {organismLabelMap[data.annotation.annotation_id]}
                                </div>
                                {types.map(type => {
                                    const td = data[geneKey]?.[type]
                                    let value = 0
                                    if (td) {
                                        if (metricField === 'count') value = td.count || 0
                                        else if (metricField === 'mean_length') value = td.length_stats?.mean || 0
                                        else if (metricField === 'per_gene') value = td.per_gene || 0
                                        else if (metricField === 'median_length') value = td.length_stats?.median || 0
                                        else if (metricField === 'exons_per_transcript') value = td.exons_per_transcript || 0
                                        else if (metricField === 'spliced_mean_length') value = td.spliced_length_stats?.mean || 0
                                        else if (metricField === 'spliced_median_length') value = td.spliced_length_stats?.median || 0
                                        else if (metricField === 'exon_mean_length') value = td.exon_length_stats?.mean || 0
                                        else if (metricField === 'exon_median_length') value = td.exon_length_stats?.median || 0
                                    }
                                    const intensity = maxValue > 0 ? value / maxValue : 0
                                    const textColor = intensity >= 0.55 ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.9)'
                                    return (
                                        <div key={`cell-${rowIdx}-${type}`} className="p-1.5 border-t border-border text-center">
                                            <div className="w-full h-6 rounded flex items-center justify-center" style={{ backgroundColor: getHeatmapColor(value) }} title={`${type}: ${value.toLocaleString()}`} >
                                                <span className="text-[10px] font-medium" style={{ color: textColor }}>{value.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    )
}

export function AnnotationsComparisonSection({
    selectedAnnotations,
    loadingStats,
    organismLabelMap
}: {
    selectedAnnotations: Annotation[]
    loadingStats: Record<string, boolean>
    organismLabelMap: Record<string, string>
}) {
    const isLoading = selectedAnnotations.some(ann => loadingStats[ann.annotation_id])
    const overlappingBiotypes = findOverlappingItems(selectedAnnotations, 'biotypes')
    const overlappingFeatureTypes = findOverlappingItems(selectedAnnotations, 'types')
    const overlappingRootTypes = findOverlappingRootTypes(selectedAnnotations)
    const overlappingAttributeKeys = findOverlappingItems(selectedAnnotations, 'attribute_keys')
    const geneData = selectedAnnotations.map(ann => {
        const fs = (ann as any).features_statistics
        return { annotation: ann, codingGenes: fs?.coding_genes, nonCodingGenes: fs?.non_coding_genes, pseudogenes: fs?.pseudogenes }
    })
    const transcriptData = selectedAnnotations.map(ann => {
        const fs = (ann as any).features_statistics
        return {
            annotation: ann,
            codingTranscriptsTypes: fs?.coding_genes?.transcripts?.types,
            nonCodingTranscriptsTypes: fs?.non_coding_genes?.transcripts?.types,
            pseudogenesTranscriptsTypes: fs?.pseudogenes?.transcripts?.types,
        }
    })
    const hasCodingGenes = geneData.some(d => d.codingGenes !== null && d.codingGenes !== undefined)
    const hasNonCodingGenes = geneData.some(d => d.nonCodingGenes !== null && d.nonCodingGenes !== undefined)
    const hasPseudogenes = geneData.some(d => d.pseudogenes !== null && d.pseudogenes !== undefined)
    const [isGffSectionOpen, setIsGffSectionOpen] = useState(false)

    return (
        <div className="flex flex-col h-full overflow-y-auto space-y-6">
            {isLoading && (
                <Card className="p-4 bg-blue-500/10 border-blue-500/20 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-500 animate-pulse" />
                        <p className="text-xs text-muted-foreground">Loading statistics...</p>
                    </div>
                </Card>
            )}
            <Collapsible open={isGffSectionOpen} onOpenChange={setIsGffSectionOpen}>
                <Card className="p-4 flex-shrink-0">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                            <h4 className="text-base font-semibold text-foreground">GFF Structure Overlap</h4>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isGffSectionOpen ? 'transform rotate-180' : ''}`} />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                        <div className="grid grid-cols-1 gap-3">
                            <OverlapCard title="Common Biotypes" items={overlappingBiotypes} totalAnnotations={selectedAnnotations.length} />
                            <OverlapCard title="Common Feature Types" items={overlappingFeatureTypes} totalAnnotations={selectedAnnotations.length} />
                            <OverlapCard title="Common Root Types" items={overlappingRootTypes} totalAnnotations={selectedAnnotations.length} />
                            <OverlapCard title="Common Attribute Keys" items={overlappingAttributeKeys} totalAnnotations={selectedAnnotations.length} />
                        </div>
                    </CollapsibleContent>
                </Card>
            </Collapsible>
            {!isLoading && (hasCodingGenes || hasNonCodingGenes || hasPseudogenes) && (
                <div className="space-y-4 flex-shrink-0">
                    <GroupedGeneComparisonChart
                        geneData={geneData}
                        hasCodingGenes={hasCodingGenes}
                        hasNonCodingGenes={hasNonCodingGenes}
                        hasPseudogenes={hasPseudogenes}
                        organismLabelMap={organismLabelMap}
                    />
                    <TranscriptTypeStackedBarChart
                        transcriptData={transcriptData}
                        hasCodingGenes={hasCodingGenes}
                        hasNonCodingGenes={hasNonCodingGenes}
                        hasPseudogenes={hasPseudogenes}
                        organismLabelMap={organismLabelMap}
                    />
                    <TranscriptTypeHeatmap
                        transcriptData={transcriptData}
                        hasCodingGenes={hasCodingGenes}
                        hasNonCodingGenes={hasNonCodingGenes}
                        hasPseudogenes={hasPseudogenes}
                        organismLabelMap={organismLabelMap}
                    />
                </div>
            )}
        </div>
    )
}

export default AnnotationsComparisonSection
