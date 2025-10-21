"use client"

import { Hero } from "@/components/hero"
import { StatsSection } from "@/components/stats-section"
import { LatestReleases } from "@/components/latest-releases"
import { TaxonomicExplorer } from "@/components/taxonomic-explorer"
import { TopAnnotations } from "@/components/top-annotated-records"

export default function Home() {
  const handleFilterSelect = () => {
    // This now does nothing as SearchBar handles navigation directly
  }

  return (
    <>
      <Hero />
      <StatsSection />
      <LatestReleases />
      <TaxonomicExplorer />
      <TopAnnotations onFilterSelect={handleFilterSelect} />
      {/* <AnnotationsCharts /> */}
    </>
  )
}
