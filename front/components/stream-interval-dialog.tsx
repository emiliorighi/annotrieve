"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Activity, Play } from "lucide-react"
import type { Annotation } from "@/lib/types"

interface StreamIntervalDialogProps {
  annotation: Annotation
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StreamIntervalDialog({ annotation, open, onOpenChange }: StreamIntervalDialogProps) {
  const [chromosome, setChromosome] = useState("chr1")
  const [start, setStart] = useState("1000000")
  const [end, setEnd] = useState("2000000")
  const [streaming, setStreaming] = useState(false)
  const [streamData, setStreamData] = useState<string[]>([])

  const handleStream = () => {
    setStreaming(true)
    setStreamData([])

    // Mock streaming data
    const mockData = [
      `##gff-version 3`,
      `${chromosome}\t${annotation.source_file_info?.database || 'Unknown'}\tgene\t${start}\t${Number.parseInt(start) + 5000}\t.\t+\t.\tID=gene1;Name=EXAMPLE1`,
      `${chromosome}\t${annotation.source_file_info?.database || 'Unknown'}\texon\t${start}\t${Number.parseInt(start) + 1000}\t.\t+\t.\tParent=gene1`,
      `${chromosome}\t${annotation.source_file_info?.database || 'Unknown'}\tCDS\t${start}\t${Number.parseInt(start) + 1000}\t.\t+\t0\tParent=gene1`,
      `${chromosome}\t${annotation.source_file_info?.database || 'Unknown'}\tgene\t${Number.parseInt(start) + 10000}\t${Number.parseInt(start) + 15000}\t.\t-\t.\tID=gene2;Name=EXAMPLE2`,
    ]

    let index = 0
    const interval = setInterval(() => {
      if (index < mockData.length) {
        setStreamData((prev) => [...prev, mockData[index]])
        index++
      } else {
        clearInterval(interval)
        setStreaming(false)
      }
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Stream Region Intervals</DialogTitle>
          <DialogDescription>Query specific genomic regions from the indexed GFF file</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Input form */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chromosome">Chromosome</Label>
              <Input
                id="chromosome"
                value={chromosome}
                onChange={(e) => setChromosome(e.target.value)}
                placeholder="chr1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Start Position</Label>
              <Input
                id="start"
                type="number"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                placeholder="1000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Position</Label>
              <Input
                id="end"
                type="number"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                placeholder="2000000"
              />
            </div>
          </div>

          {/* File info */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Source:</span>
              <Badge variant="outline">{annotation.source_file_info?.database || 'Unknown'}</Badge>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-muted-foreground">File:</span>
              <span className="font-mono text-xs truncate ml-2">{annotation.annotation_id}</span>
            </div>
          </div>

          {/* Stream button */}
          <Button onClick={handleStream} disabled={streaming} className="w-full">
            {streaming ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-pulse" />
                Streaming...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Stream
              </>
            )}
          </Button>

          {/* Stream output */}
          {streamData.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Label className="mb-2">Stream Output ({streamData.length} lines)</Label>
              <div className="flex-1 bg-black/95 rounded-lg p-4 overflow-auto font-mono text-xs text-green-400">
                {streamData.map((line, index) => (
                  <div key={index} className="whitespace-pre">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
