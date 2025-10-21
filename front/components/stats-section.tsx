"use client"

import { useState, useEffect } from "react"
import { Database, Dna, FileText } from "lucide-react"
import { StatsCard } from "@/components/ui/stats-card"
import { listAnnotations } from "@/lib/api/annotations"
import { listAssemblies } from "@/lib/api/assemblies"
import { listOrganisms } from "@/lib/api/organisms"

export function StatsSection() {
  const [stats, setStats] = useState({
    totalAnnotations: 0,
    totalOrganisms: 0,
    totalAssemblies: 0,
    isLoading: true
  })

  // Fetch stats on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        const [annotationsData, organismsData, assembliesData] = await Promise.all([
          listAnnotations({ limit: 1 }),
          listOrganisms({ limit: 1 }),
          listAssemblies({ limit: 1 })
        ])

        setStats({
          totalAnnotations: annotationsData.total || 0,
          totalOrganisms: organismsData.total || 0,
          totalAssemblies: assembliesData.total || 0,
          isLoading: false
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        setStats(prev => ({ ...prev, isLoading: false }))
      }
    }

    fetchStats()
  }, [])

  if (stats.isLoading) {
    return null // Or show skeleton
  }

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-foreground mb-3">
          Database Overview
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Explore our comprehensive collection of genome annotations from Ensembl and NCBI, 
          covering thousands of eukaryotic species and assemblies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          value={stats.totalAnnotations}
          label="Annotations"
          icon={FileText}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
          delay="0ms"
          padding="p-6"
          textSize="text-3xl"
          iconSize="h-6"
          iconWidth="w-6"
        />
        <StatsCard
          value={stats.totalOrganisms}
          label="Organisms"
          icon={Dna}
          color="text-green-500"
          bgColor="bg-green-500/10"
          delay="150ms"
          padding="p-6"
          textSize="text-3xl"
          iconSize="h-6"
          iconWidth="w-6"
        />
        <StatsCard
          value={stats.totalAssemblies}
          label="Assemblies"
          icon={Database}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
          delay="300ms"
          padding="p-6"
          textSize="text-3xl"
          iconSize="h-6"
          iconWidth="w-6"
        />
      </div>
    </section>
  )
}

