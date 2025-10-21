"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSelectedAnnotationsStore } from "@/lib/stores/selected-annotations"
import { X, Download, Star, FileText, Eye } from "lucide-react"
import { useRouter } from "next/navigation"

interface FavoritesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FavoritesModal({ open, onOpenChange }: FavoritesModalProps) {
  const router = useRouter()
  const { getSelectedAnnotations, removeFromCart, clearSelection } = useSelectedAnnotationsStore()
  const favorites = getSelectedAnnotations()

  const handleDownload = (annotation: any) => {
    const link = document.createElement('a')
    link.href = `https://genome.crg.es/annotrieve/files/${annotation.indexed_file_info.bgzipped_path}`
    link.download = ''
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleViewInBrowser = (annotation: any) => {
    router.push(`/jbrowse/?accession=${annotation.assembly_accession}&annotationId=${annotation.annotation_id}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-current" />
            Favorite Annotations
          </DialogTitle>
          <DialogDescription>
            Your saved annotations ({favorites.length})
          </DialogDescription>
        </DialogHeader>

        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Star className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg">No favorites yet</p>
            <p className="text-sm">Click the star icon on any annotation to add it to your favorites</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {favorites.length} annotation{favorites.length !== 1 ? 's' : ''} saved
                </p>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => {
                    router.push('/annotations/?showFavs=true')
                    onOpenChange(false)
                  }}
                >
                  View All Favorites
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearSelection}
                className="text-destructive hover:text-destructive"
              >
                Clear All
              </Button>
            </div>

            <div className="space-y-3">
              {favorites.map((annotation) => (
                <div 
                  key={annotation.annotation_id}
                  className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {annotation.source_file_info.database}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {annotation.source_file_info.provider}
                        </Badge>
                      </div>
                      
                      <h4 className="font-semibold italic">
                        {annotation.organism_name}
                      </h4>
                      
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="font-mono text-xs bg-muted/50 px-2 py-0.5 rounded">
                          {annotation.assembly_accession}
                        </span>
                        <span className="text-xs">{annotation.assembly_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewInBrowser(annotation)}
                        title="View in Browser"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(annotation)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFromCart(annotation.annotation_id)}
                        className="text-destructive hover:text-destructive"
                        title="Remove from favorites"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

