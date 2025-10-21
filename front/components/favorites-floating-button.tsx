"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { FavoritesModal } from "@/components/favorites-modal"
import { useSelectedAnnotationsStore } from "@/lib/stores/selected-annotations"

export function FavoritesFloatingButton() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { getSelectionCount } = useSelectedAnnotationsStore()
  const count = getSelectionCount()

  // Prevent hydration mismatch by only showing count after client-side mount
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      <Button
        size="lg"
        onClick={() => setOpen(true)}
        className="fixed right-6 bottom-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-40"
        title="View favorites"
      >
        <div className="relative">
          <Star className="h-6 w-6 fill-current" />
          {mounted && count > 0 && (
            <span className="absolute -top-5 -right-5 text-xs bg-secondary text-secondary-foreground font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </div>
      </Button>

      <FavoritesModal open={open} onOpenChange={setOpen} />
    </>
  )
}

