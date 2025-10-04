"use client"

import { Badge } from "@/components/ui/badge"
import { OrganismRecord } from "@/lib/api/types"
import { listAssemblies } from "@/lib/api/assemblies"
import { useEffect, useState } from "react"

interface OrganismDetailViewProps {
  organismDetails: OrganismRecord
}

export function OrganismDetailView({ organismDetails }: OrganismDetailViewProps) {
  const [assemblies, setAssemblies] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchAssemblies() {
      if (!organismDetails?.taxid) return
      setLoading(true)
      setError(null)
      try {
        const res = await listAssemblies({ taxids: organismDetails.taxid, limit: 50, offset: 0 })
        if (cancelled) return
        const list = (res.results || []).map((a: any) => String(a.assembly_accession ?? a.assemblyAccession ?? ""))
        setAssemblies(list.filter(Boolean))
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load assemblies")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAssemblies()
    return () => { cancelled = true }
  }, [organismDetails?.taxid])

  if (!organismDetails) {
    return <div className="text-muted-foreground">Organism not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Main info */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-3xl font-bold mb-2">{(organismDetails as any).common_name || (organismDetails as any).organism_name}</h3>
            <p className="text-lg text-muted-foreground italic">{(organismDetails as any).organism_name}</p>
          </div>
          <Badge variant="outline" className="text-sm">
            {organismDetails.taxid}
          </Badge>
        </div>
        <p className="text-foreground leading-relaxed">Wiki description not available</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Total Annotations</div>
          <div className="text-2xl font-bold text-primary">{(organismDetails as any).annotations_count}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Total Assemblies</div>
          <div className="text-2xl font-bold">{(organismDetails as any).assemblies_count}</div>
        </div>
      </div>

      {/* Assemblies */}
      <div>
        <h4 className="text-lg font-semibold mb-3">Available Assemblies</h4>
        {loading && <div className="text-sm text-muted-foreground">Loading assemblies...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}
        {!loading && !error && (
          <div className="grid gap-2">
            {assemblies.map((assembly) => (
              <div key={assembly} className="border rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="font-mono text-sm font-medium">{assembly}</span>
                <Badge variant="secondary" className="text-xs">
                  Assembly
                </Badge>
              </div>
            ))}
            {assemblies.length === 0 && (
              <div className="text-sm text-muted-foreground">No assemblies found for this organism.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
