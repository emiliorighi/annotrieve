"use client"

import Link from "next/link"
import { Github } from "lucide-react"
import { SearchBar } from "@/components/search-bar"
import { Badge } from "@/components/ui/badge"
import { useBetaBanner } from "@/components/beta-banner-provider"

export function AppHeader() {
  const { toggleBanner } = useBetaBanner()

  return (
    <header className="border-b bg-card sticky top-0 z-10">
      <div className="flex items-center py-4">
        {/* Left side - Title */}
        <div className="px-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-bold text-foreground whitespace-nowrap">Annotrieve</h1>
            <Badge 
              variant="secondary" 
              className="text-xs font-semibold cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleBanner()
              }}
            >
              BETA
            </Badge>
          </Link>
        </div>

        {/* Center - Search bar (container aligned) */}
        <div className="flex-1 container mx-auto px-4">
          <SearchBar />
        </div>

        {/* Right side - Navigation links */}
        <nav className="flex items-center gap-6 px-6">
          <Link href="/faqs/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            FAQs
          </Link>
          <Link href="/api-docs/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            API
          </Link>
          <a 
            href="https://github.com/emiliorighi/annotrieve" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
          </a>
        </nav>
      </div>
    </header>
  )
}
