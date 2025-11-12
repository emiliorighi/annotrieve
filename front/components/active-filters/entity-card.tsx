"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { ReactNode } from "react"

interface EntityCardProps {
  id: string
  title: string
  subtitle: string
  icon: ReactNode
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCardClick: (e: React.MouseEvent) => void
  onMouseEnter: () => void
  onMouseLeave: (e: React.MouseEvent) => void
  onRemove: () => void
  colorScheme: {
    bg: string
    bgHover: string
    bgOpen: string
    border: string
    text: string
    textSecondary: string
    icon: string
    buttonHover: string
  }
  popoverContent: ReactNode
  onPopoverMouseEnter: () => void
  onPopoverMouseLeave: () => void
  subtitleClassName?: string
}

export function EntityCard({
  id,
  title,
  subtitle,
  icon,
  isOpen,
  onOpenChange,
  onCardClick,
  onMouseEnter,
  onMouseLeave,
  onRemove,
  colorScheme,
  popoverContent,
  onPopoverMouseEnter,
  onPopoverMouseLeave,
  subtitleClassName
}: EntityCardProps) {
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div
          onClick={onCardClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer",
            colorScheme.bg,
            colorScheme.border,
            colorScheme.bgHover,
            isOpen && colorScheme.bgOpen,
            "transition-colors"
          )}
        >
          <div className={cn("h-3.5 w-3.5", colorScheme.icon)}>
            {icon}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className={cn("font-medium truncate", colorScheme.text, id.includes("assembly") && "max-w-[200px]")}>{title}</span>
            <span className={cn("text-xs", colorScheme.textSecondary, subtitleClassName)}>{subtitle}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            title="Remove filter"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[500px] max-w-[90vw] max-h-[80vh] overflow-y-auto p-0"
        side="bottom"
        align="start"
        sideOffset={8}
        onMouseEnter={onPopoverMouseEnter}
        onMouseLeave={onPopoverMouseLeave}
      >
        {popoverContent}
      </PopoverContent>
    </Popover>
  )
}

