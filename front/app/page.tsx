"use client"

import { Hero } from "@/components/hero"
import { StatsSection } from "@/components/stats-section"
import { LatestReleases } from "@/components/latest-releases"
import { TaxonomicExplorer } from "@/components/taxonomic-explorer"
import { TopAnnotations } from "@/components/top-annotated-records"
import { SectionWrapper } from "@/components/ui/section-wrapper"

export default function Home() {
  const handleFilterSelect = () => {
    // This now does nothing as SearchBar handles navigation directly
  }

  return (
    <>
      <Hero />
      
      <SectionWrapper id="stats" backgroundVariant="default">
        <div className="py-16">
          <StatsSection />
        </div>

      </SectionWrapper>
      
      <SectionWrapper id="latest-releases" backgroundVariant="muted">
        <div className="py-16">
          <LatestReleases />
        </div>
      </SectionWrapper>
      
      <SectionWrapper id="taxonomic-explorer" backgroundVariant="default">
        <div className="py-16">
          <TaxonomicExplorer />
        </div>
      </SectionWrapper>
      
      <SectionWrapper id="top-annotations" backgroundVariant="muted">
        <div className="py-16">
          <TopAnnotations onFilterSelect={handleFilterSelect} />
        </div>
      </SectionWrapper>
    </>
  )
}
