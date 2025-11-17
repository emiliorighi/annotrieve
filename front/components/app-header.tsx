"use client"

import Link from "next/link"
import { Github, Sun, Moon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useBetaBanner } from "@/components/beta-banner-provider"
import { useUIStore } from "@/lib/stores/ui"

export function AppHeader() {
  const { toggleBanner } = useBetaBanner()
  const theme = useUIStore((state) => state.theme)
  const toggleTheme = useUIStore((state) => state.toggleTheme)

  return (
    <header className="border-b bg-card sticky top-0 z-10">
      <div className="flex items-center justify-center lg:justify-between flex-wrap px-6 py-4 gap-4">
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

        <nav className="flex items-center gap-4">

          <Link href="/faqs/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            FAQs
          </Link>
          <Link href="/api-docs/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            API
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
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
