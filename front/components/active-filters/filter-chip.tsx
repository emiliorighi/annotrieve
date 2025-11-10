"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterChipProps {
  label: string
  value: string
  onRemove: () => void
  colorScheme: {
    bg: string
    bgHover: string
    border: string
    text: string
  }
}

export function FilterChip({ label, value, onRemove, colorScheme }: FilterChipProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
        colorScheme.bg,
        colorScheme.border,
        colorScheme.bgHover,
        "transition-colors"
      )}
    >
      <span className={cn("font-medium", colorScheme.text)}>{label}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
        onClick={onRemove}
        title="Remove filter"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

