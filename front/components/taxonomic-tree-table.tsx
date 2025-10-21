"use client"

import { useRouter } from "next/navigation"
import { TaxonRecord } from "@/lib/api/types"
import { Badge } from "@/components/ui/badge"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Info } from "lucide-react"

interface TreeNode {
  taxid: string
  scientific_name: string
  rank: string
  annotations_count: number
  children?: TreeNode[]
  level: number
}

interface TaxonomicTreeTableProps {
  ancestors: TaxonRecord[]
  currentTaxon: TaxonRecord
  children: TaxonRecord[]
  onTaxonClick?: (taxid: string) => void
}

export function TaxonomicTreeTable({ ancestors, currentTaxon, children, onTaxonClick }: TaxonomicTreeTableProps) {
  const router = useRouter()

  // Build the tree structure
  const buildTree = (): TreeNode[] => {
    const tree: TreeNode[] = []
    
    // Filter out current taxon from ancestors if it's included
    const filteredAncestors = ancestors.filter(ancestor => ancestor.taxid !== currentTaxon.taxid)
    
    // Add ancestors in order (from root to parent)
    let currentLevel = 0
    
    if (filteredAncestors.length > 0) {
      filteredAncestors.forEach((ancestor, index) => {
        tree.push({
          taxid: ancestor.taxid,
          scientific_name: ancestor.scientific_name || "",
          rank: ancestor.rank || "",
          annotations_count: ancestor.annotations_count || 0,
          level: currentLevel,
          children: index === filteredAncestors.length - 1 ? [{
            taxid: currentTaxon.taxid,
            scientific_name: currentTaxon.scientific_name || "",
            rank: currentTaxon.rank || "",
            annotations_count: currentTaxon.annotations_count || 0,
            level: currentLevel + 1,
            children: children.map(child => ({
              taxid: child.taxid,
              scientific_name: child.scientific_name || "",
              rank: child.rank || "",
              annotations_count: child.annotations_count || 0,
              level: currentLevel + 2,
            }))
          }] : undefined
        })
        currentLevel++
      })
    } else {
      // If no ancestors, just show current and children
      tree.push({
        taxid: currentTaxon.taxid,
        scientific_name: currentTaxon.scientific_name || "" ,
        rank: currentTaxon.rank || "",
        annotations_count: currentTaxon.annotations_count || 0,
        level: 0,
        children: children.map(child => ({
          taxid: child.taxid,
          scientific_name: child.scientific_name || "",
          rank: child.rank || "",
          annotations_count: child.annotations_count || 0,
          level: 1,
        }))
      })
    }

    return tree
  }


  const TreeRow = ({ node, isCurrent }: { node: TreeNode; isCurrent: boolean }) => {
    const hasChildren = node.children && node.children.length > 0

    return (
      <>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <tr 
              className={`border-b hover:bg-muted/50 transition-colors cursor-pointer ${
                isCurrent ? 'bg-primary/5' : ''
              }`}
              onClick={(e) => {
                // Don't trigger if clicking the expand/collapse button
                onTaxonClick?.(node.taxid)
              }}
            >
              <td className="p-3">
                <div className="flex items-center gap-2" style={{ paddingLeft: `${node.level * 24}px` }}>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>
                      {node.scientific_name}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {node.rank}
                    </Badge>
                  </div>
                </div>
              </td>
              <td className="p-3 text-right">
                <span className={`font-semibold ${isCurrent ? 'text-primary' : ''}`}>
                  {node.annotations_count.toLocaleString()}
                </span>
              </td>
            </tr>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => router.push(`/annotations/?taxon=${node.taxid}`)}>
              View Taxon Details
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        {hasChildren && node.children?.map((child) => (
          <TreeRow 
            key={child.taxid} 
            node={child} 
            isCurrent={child.taxid === currentTaxon.taxid}
          />
        ))}
      </>
    )
  }

  const tree = buildTree()

  return (
    <div className="w-full">
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="p-3 text-left font-semibold text-sm">Taxonomic Name</th>
              <th className="p-3 text-right font-semibold text-sm">Annotations</th>
            </tr>
          </thead>
          <tbody>
            {tree.map((node) => (
              <TreeRow 
                key={node.taxid} 
                node={node} 
                isCurrent={node.taxid === currentTaxon.taxid}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

