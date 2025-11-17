"use client"

import { Heart, BarChart2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SectionHeader } from "@/components/ui/section-header"

export function FavoritesGuide() {
  return (
    <div className="container mx-auto px-4 py-12">
      <SectionHeader
        title="Add to favorites & compare"
        description="Save annotations to favorites and compare GFF statistics across sources and versions."
        icon={Heart}
        iconColor="text-rose-600"
        iconBgColor="bg-rose-500/10"
        align="center"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <Heart className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Save favorites</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Use the heart action to quickly save an annotation. Access your list from the top bar.
          </p>
          <Button variant="outline" className="w-full" disabled>
            Example: Add “GCF_000001405.40” to favorites
          </Button>
        </Card>

        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h4 className="font-semibold">Compare GFF statistics</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Compare feature counts, attributes, and other metrics across your saved annotations to decide which to use.
          </p>
        </Card>
      </div>
    </div>
  )
}


