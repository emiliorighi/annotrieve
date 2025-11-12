"use client"

import { Database, ExternalLink, AlertCircle, ChevronRight, Loader2 } from "lucide-react"
import type { TaxonRecord } from "@/lib/api/types"
import { getTaxonAncestors } from "@/lib/api/taxons"
import { useState, useEffect } from "react"

interface TaxonDetailPopoverProps {
  details: TaxonRecord | undefined
  isLoading: boolean
}

interface WikipediaSummary {
  title: string
  extract: string
  content_urls: {
    desktop: {
      page: string
    }
  }
  thumbnail?: {
    source: string
    width: number
    height: number
  }
}

const MAX_EXTRACT_LENGTH = 200

export function TaxonDetailPopover({ details, isLoading }: TaxonDetailPopoverProps) {
  const [ancestors, setAncestors] = useState<TaxonRecord[]>([])
  const [loadingAncestors, setLoadingAncestors] = useState(false)
  const [wikiSummary, setWikiSummary] = useState<WikipediaSummary | null>(null)
  const [loadingWiki, setLoadingWiki] = useState(false)
  const [wikiError, setWikiError] = useState<string | null>(null)

  useEffect(() => {
    if (!details?.taxid) return

    // Load ancestors
    const fetchAncestors = async () => {
      setLoadingAncestors(true)
      try {
        const response = await getTaxonAncestors(details.taxid)
        setAncestors(response.results || [])
      } catch (error) {
        console.error("Error fetching ancestors:", error)
      } finally {
        setLoadingAncestors(false)
      }
    }

    // Load Wikipedia summary
    const fetchWikiSummary = async () => {
      if (!details.scientific_name) return
      setLoadingWiki(true)
      setWikiError(null)
      try {
        const response = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(details.scientific_name)}`
        )
        if (response.ok) {
          const data: WikipediaSummary = await response.json()
          if (data.extract && data.extract.trim().length > 0) {
            setWikiSummary(data)
          } else {
            setWikiError("No summary available")
          }
        } else if (response.status === 404) {
          setWikiError("No Wikipedia summary found")
        } else {
          setWikiError("Failed to load Wikipedia summary")
        }
      } catch (error) {
        console.error("Error fetching Wikipedia summary:", error)
        setWikiError("Failed to load Wikipedia summary")
      } finally {
        setLoadingWiki(false)
      }
    }

    fetchAncestors()
    fetchWikiSummary()
  }, [details?.taxid, details?.scientific_name])

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">Loading taxon details...</div>
  }

  if (!details) {
    return <div className="p-6 text-center text-muted-foreground">Failed to load taxon details</div>
  }

  const truncatedExtract = wikiSummary?.extract
    ? wikiSummary.extract.length > MAX_EXTRACT_LENGTH
      ? wikiSummary.extract.substring(0, MAX_EXTRACT_LENGTH) + "..."
      : wikiSummary.extract
    : null
  const isTruncated = wikiSummary?.extract && wikiSummary.extract.length > MAX_EXTRACT_LENGTH

  const displayedAncestors = ancestors.slice(-10).filter(ancestor => ancestor.taxid !== details.taxid)

  return (
    <div className="p-3">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold mb-0.5 leading-tight">{details.scientific_name}</h3>
            <p className="text-xs text-muted-foreground italic">{details.rank}</p>
          </div>
          {details.annotations_count !== undefined && (
            <div className="flex-shrink-0 text-right">
              <div className="text-xs font-medium text-muted-foreground">Annotations</div>
              <div className="text-sm font-semibold">{details.annotations_count.toLocaleString()}</div>
            </div>
          )}
        </div>

        {/* Lineage Breadcrumb */}
        {loadingAncestors ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Loading lineage...</span>
          </div>
        ) : displayedAncestors.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground pb-1">
            {displayedAncestors.map((ancestor, index) => (
              <div key={ancestor.taxid} className="flex items-center gap-1">
                <span className="hover:text-foreground transition-colors truncate max-w-[80px]">
                  {ancestor.scientific_name || ancestor.taxid}
                </span>
                {index < displayedAncestors.length - 1 && (
                  <ChevronRight className="h-2.5 w-2.5 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Key Info Card */}
        <div className="flex items-start gap-1.5 p-2 border rounded-md bg-muted/30">
          <Database className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium mb-0.5 text-muted-foreground uppercase tracking-wide">NCBI TaxID</div>
            <div className="font-mono text-xs leading-tight">{details.taxid}</div>
          </div>
        </div>


        {/* Wikipedia Summary */}
        {loadingWiki && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Loading Wikipedia...</span>
          </div>
        )}
        {wikiError && !loadingWiki && (
          <div className="text-xs text-muted-foreground py-1">{wikiError}</div>
        )}
        {wikiSummary && !loadingWiki && !wikiError && (
          <div className="border rounded-md p-2 bg-muted/30 space-y-1.5">
            <div className="flex items-start gap-2">
              {wikiSummary.thumbnail && (
                <img
                  src={wikiSummary.thumbnail.source}
                  alt={wikiSummary.title}
                  className="w-12 h-12 object-cover rounded border flex-shrink-0"
                  loading="lazy"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {truncatedExtract}
                </p>
                {isTruncated && (
                  <a
                    href={wikiSummary.content_urls.desktop.page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-[10px] mt-1.5 transition-colors"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    Read more on Wikipedia
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground pt-1.5 border-t">
              <AlertCircle className="h-2.5 w-2.5 mt-0.5 flex-shrink-0" />
              <span>Note: Wikipedia descriptions may be inaccurate or outdated.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

