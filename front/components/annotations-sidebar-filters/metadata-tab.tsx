"use client"

import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface MetadataTabProps {
  biotypes: string[]
  onBiotypesChange: (biotypes: string[]) => void
  featureTypes: string[]
  onFeatureTypesChange: (types: string[]) => void
  pipelines: string[]
  onPipelinesChange: (pipelines: string[]) => void
  providers: string[]
  onProvidersChange: (providers: string[]) => void
  source: string
  onSourceChange: (source: string) => void
  biotypeOptions: Record<string, number>
  featureTypeOptions: Record<string, number>
  pipelineOptions: Record<string, number>
  providerOptions: Record<string, number>
  sourceOptions: Record<string, number>
  loadingSection: string | null
  metadataAccordionValue: string | undefined
  onMetadataAccordionChange: (value: string | undefined) => void
  renderFilterSection: (
    title: string,
    options: Record<string, number>,
    selected: string[],
    onChange: (values: string[]) => void,
    key: string,
    isLoading: boolean
  ) => JSX.Element
}

export function MetadataTab({
  biotypes,
  onBiotypesChange,
  featureTypes,
  onFeatureTypesChange,
  pipelines,
  onPipelinesChange,
  providers,
  onProvidersChange,
  source,
  onSourceChange,
  biotypeOptions,
  featureTypeOptions,
  pipelineOptions,
  providerOptions,
  sourceOptions,
  loadingSection,
  metadataAccordionValue,
  onMetadataAccordionChange,
  renderFilterSection
}: MetadataTabProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Annotation Metadata Filters</Label>
        <p className="text-xs text-muted-foreground">
          Filter annotations by their metadata properties. Open a section to see available options and counts.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <Accordion
          type="single"
          className="w-full"
          value={metadataAccordionValue}
          onValueChange={onMetadataAccordionChange}
          collapsible
        >
          {renderFilterSection(
            "Biotypes",
            biotypeOptions,
            biotypes,
            onBiotypesChange,
            "biotypes",
            loadingSection === "biotypes"
          )}
          {renderFilterSection(
            "Feature Types",
            featureTypeOptions,
            featureTypes,
            onFeatureTypesChange,
            "feature-types",
            loadingSection === "feature-types"
          )}
          {renderFilterSection(
            "Pipelines",
            pipelineOptions,
            pipelines,
            onPipelinesChange,
            "pipelines",
            loadingSection === "pipelines"
          )}
          {renderFilterSection(
            "Providers",
            providerOptions,
            providers,
            onProvidersChange,
            "providers",
            loadingSection === "providers"
          )}
          {renderFilterSection(
            "Database Sources",
            sourceOptions,
            source && source !== "all" ? [source] : [],
            (values) => onSourceChange(values.length > 0 ? values[0] : "all"),
            "sources",
            loadingSection === "sources"
          )}
        </Accordion>
      </div>
    </div>
  )
}

