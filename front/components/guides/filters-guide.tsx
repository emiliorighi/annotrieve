"use client"

import { Filter, Search, ListChecks } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SectionHeader } from "@/components/ui/section-header"

export function FiltersGuide() {
  return (
    <div className="container mx-auto px-4 py-12">
      <SectionHeader
        title="Explore with filters"
        description="Combine filters to narrow down annotations by assemblies, organisms, taxonomic groups, and more."
        icon={Filter}
        iconColor="text-teal-600"
        iconBgColor="bg-teal-500/10"
        align="center"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <Search className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">View assemblies</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Open the assemblies view to browse or sort by release date and annotations count.
          </p>
        </Card>

        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <ListChecks className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Click on a chip</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Add filters by clicking chips. Here is an example:
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Assembly: GCF_000001405.40</Badge>
            <Badge variant="outline">Taxon: Mammalia</Badge>
            <Badge variant="outline">Source: Ensembl</Badge>
          </div>
        </Card>
      </div>
    </div>
  )
}


