"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, X } from "lucide-react"
import type { SearchResult, FilterType } from "@/lib/types"
import { listOrganisms } from "@/lib/api/organisms"
import { listAssemblies } from "@/lib/api/assemblies"
import { listTaxons } from "@/lib/api/taxons"

/** Debounce a value, returning the debounced version. */
function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

interface SearchBarProps {
  onFilterSelect: (type: FilterType, object: Record<string, any>) => void
}

export function SearchBar({ onFilterSelect }: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query, 300) // debounce INPUT, not selection
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)

  // Track latest request to ignore stale responses
  const latestReqId = useRef(0)

  // Fetch results when the DEBOUNCED query changes
  useEffect(() => {
    let cancelled = false

    async function run(currentReqId: number) {
      if (debouncedQuery.trim().length < 2) {
        setResults([])
        setIsOpen(false)
        setSelectedIndex(0)
        return
      }

      try {
        const [orgRes, asmRes, taxRes] = await Promise.all([
          listOrganisms({ filter: debouncedQuery, limit: 5, offset: 0 }).catch(() => ({ results: [] } as any)),
          listAssemblies({ filter: debouncedQuery, limit: 5, offset: 0 }).catch(() => ({ results: [] } as any)),
          listTaxons({ filter: debouncedQuery, limit: 5, offset: 0 }).catch(() => ({ results: [] } as any)),
        ])

        // Ignore if another newer request finished first or effect unmounted
        if (cancelled || currentReqId !== latestReqId.current) return

        const next: SearchResult[] = []

        // Organisms (first 3)
        for (const o of orgRes.results.slice(0, 3) || []) {
          const taxid = String((o as any).taxid ?? "")
          const scientific = String((o as any).organism_name ?? (o as any).organismName ?? "")
          const common = (o as any).common_name ?? (o as any).commonName
          const annotationCount = (o as any).annotations_count ?? (o as any).annotationCount ?? 0
          next.push({
            type: "organism",
            id: o,
            name: (common as string) || scientific || taxid,
            subtitle: scientific || taxid,
            annotationCount,
            relatedObject: o,
          })
        }

        // Assemblies (first 3)
        for (const a of asmRes.results.slice(0, 3) || []) {
          const accession = String((a as any).assembly_accession ?? (a as any).assemblyAccession ?? "")
          const asmName = String((a as any).assembly_name ?? (a as any).assemblyName ?? "")
          const orgName = String((a as any).organism_name ?? (a as any).organismName ?? "")
          const annotationCount = (a as any).annotations_count ?? (a as any).annotationCount ?? 0
          next.push({
            type: "assembly",
            id: accession || asmName,
            name: asmName || accession,
            subtitle: orgName && accession ? `${orgName} • ${accession}` : accession,
            annotationCount,
            relatedObject: a,
          })
        }

        // Taxons (first 3) filter out taxons with no children (leaves are the organisms)
        for (const t of taxRes.results.filter((t: any) => t.children.length > 0).slice(0, 3) || []) {
          const taxid = String((t as any).taxid ?? "")
          const scientific = String((t as any).scientific_name ?? (t as any).scientificName ?? "")
          const common = (t as any).common_name ?? (t as any).commonName
          const rank = String((t as any).rank ?? "")
          const annotationCount = (t as any).annotations_count ?? (t as any).annotationCount ?? 0
          next.push({
            type: "taxon",
            id: taxid,
            name: (common as string) || scientific || taxid,
            subtitle: rank && scientific ? `${rank} • ${scientific}` : scientific,
            annotationCount,
            relatedObject: t,
          })
        }

        setResults(next.slice(0, 8))
        setIsOpen(next.length > 0)
        setSelectedIndex(0)
      } catch {
        if (!cancelled && latestReqId.current === currentReqId) {
          setResults([])
          setIsOpen(false)
          setSelectedIndex(0)
        }
      }
    }

    const reqId = ++latestReqId.current
    run(reqId)

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % results.length)
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
        break
      case "Enter":
        e.preventDefault()
        if (results[selectedIndex]) handleSelect(results[selectedIndex])
        break
      case "Escape":
        setIsOpen(false)
        break
    }
  }

  // Immediate selection (no debounce)
  const handleSelect = useCallback(
    (result: SearchResult) => {
      // Navigate to annotations page with appropriate query parameter
      const paramKey = result.type === 'assembly' ? 'assembly' 
        : result.type === 'organism' ? 'organism' 
        : 'taxon'
      
      const paramValue = result.type === 'assembly' 
        ? (result.relatedObject as any).assembly_accession 
        : (result.relatedObject as any).taxid
      
      router.push(`/annotations/?${paramKey}=${paramValue}`)
      
      setQuery("")
      setResults([])
      setIsOpen(false)
      setSelectedIndex(0)
    },
    [router]
  )

  const getTypeColor = (type: string) => {
    switch (type) {
      case "taxon":
        return "bg-primary/10 text-primary border-primary/20"
      case "organism":
        return "bg-secondary/10 text-secondary border-secondary/20"
      case "assembly":
        return "bg-accent/10 text-accent border-accent/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by organism, taxon or assembly.."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!isOpen && e.target.value.length >= 2) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => debouncedQuery.length >= 2 && results.length > 0 && setIsOpen(true)}
          className="pl-10 pr-10 h-11 bg-background"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("")
              setIsOpen(false)
              setResults([])
              setSelectedIndex(0)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-accent/50 transition-colors text-left ${
                  index === selectedIndex ? "bg-accent/50" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-xs capitalize ${getTypeColor(result.type)}`}>
                      {result.type}
                    </Badge>
                    <span className="font-medium text-sm text-foreground truncate">{result.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {result.annotationCount} annotations
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
