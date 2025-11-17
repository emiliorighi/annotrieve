"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, X } from "lucide-react"

interface FilterHeaderProps {
  onClose?: () => void
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export function FilterHeader({
  onClose,
  hasActiveFilters,
  onClearFilters,
}: FilterHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-6 pt-6 pb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0 shrink-0"
              title="Close filters"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-xl font-semibold truncate">Filters</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onClearFilters}
              className="h-8 px-3 gap-1.5 text-xs"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear All</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

