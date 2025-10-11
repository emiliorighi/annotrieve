"use client"

import { useState, useEffect } from "react"
import { Loader2, ExternalLink, AlertCircle } from "lucide-react"

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

interface WikiSummaryProps {
  searchTerm: string
  className?: string
}

export function WikiSummary({ searchTerm, className = "" }: WikiSummaryProps) {
  const [summary, setSummary] = useState<WikipediaSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSummary(null)
      setError(null)
      return
    }

    const fetchWikiSummary = async () => {
      setLoading(true)
      setError(null)
      
      try {

        const response = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`
        )
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("No Wikipedia summary found")
            setSummary(null)
            return
          }
          throw new Error(`HTTP ${response.status}`)
        }
        
        const data: WikipediaSummary = await response.json()
        
        // Check if we got a valid summary
        if (data.extract && data.extract.trim().length > 0) {
          setSummary(data)
          setError(null)
        } else {
          setError("No summary available")
          setSummary(null)
        }
      } catch (err) {
        console.error('Error fetching Wikipedia summary:', err)
        setError("Failed to load Wikipedia summary")
        setSummary(null)
      } finally {
        setLoading(false)
      }
    }

    fetchWikiSummary()
  }, [searchTerm])

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading Wikipedia summary...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">{error}</span>
      </div>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <div className="border rounded-lg p-6 bg-muted/30">
      <div className="flex items-start gap-4">
        {summary.thumbnail && (
          <img
            src={summary.thumbnail.source}
            alt={summary.title}
            className="w-32 h-32 object-cover rounded-lg border flex-shrink-0"
            loading="lazy"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-muted-foreground leading-relaxed text-sm">
            {summary.extract}
          </p>
          <a
            href={summary.content_urls.desktop.page}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-xs mt-2 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Read more on Wikipedia
          </a>
        </div>
      </div>
    </div>
  )
}
