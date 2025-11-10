"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, X, Loader2, ChevronRight, ChevronDown } from "lucide-react"
import { getTaxonChildren, getTaxon } from "@/lib/api/taxons"
import { cn } from "@/lib/utils"

interface TreeNode {
  taxid: string
  scientific_name: string
  rank: string
  annotations_count?: number
  organisms_count?: number
  children?: TreeNode[]
  childrenLoaded?: boolean
  isLoading?: boolean
}

interface CompactTaxonomicTreeProps {
  selectedTaxids: string[]
  onTaxonToggle: (taxid: string) => void
  expandedNodes?: Set<string>
  onExpandedNodesChange?: (nodes: Set<string>) => void
  maxDepth?: number
}

export function CompactTaxonomicTree({
  selectedTaxids,
  onTaxonToggle,
  expandedNodes: externalExpandedNodes,
  onExpandedNodesChange,
  maxDepth = 5
}: CompactTaxonomicTreeProps) {
  const [internalExpandedNodes, setInternalExpandedNodes] = useState<Set<string>>(new Set())
  const [rootNode, setRootNode] = useState<TreeNode | null>(null)
  const [loadingRoot, setLoadingRoot] = useState(true)
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set())

  // Use external or internal state for expanded nodes
  const expandedNodes = externalExpandedNodes || internalExpandedNodes
  const setExpandedNodes = onExpandedNodesChange || setInternalExpandedNodes

  // Check if a node has children based on organisms_count
  const hasChildren = (node: TreeNode): boolean => {
    return (node.organisms_count ?? 0) > 0
  }

  // Helper to find a node in the tree by taxid
  const findNodeInTree = useCallback((node: TreeNode, taxid: string): TreeNode | null => {
    if (node.taxid === taxid) {
      return node
    }
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeInTree(child, taxid)
        if (found) return found
      }
    }
    return null
  }, [])

  // Helper to update a node in the tree
  const updateNodeInTree = useCallback((node: TreeNode, taxid: string, updater: (node: TreeNode) => TreeNode): TreeNode => {
    if (node.taxid === taxid) {
      return updater(node)
    }
    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => updateNodeInTree(child, taxid, updater))
      }
    }
    return node
  }, [])

  // Load children for a node
  const loadChildren = useCallback(async (node: TreeNode) => {
    const taxid = node.taxid
    
    // Prevent duplicate loading - check loadingNodes set
    if (loadingNodes.has(taxid)) {
      return
    }

    // Mark as loading
    setLoadingNodes(prev => new Set(prev).add(taxid))
    
    // Update node to show loading state
    setRootNode(prev => {
      if (!prev) return prev
      const currentNode = findNodeInTree(prev, taxid)
      if (currentNode && currentNode.childrenLoaded) {
        // Already loaded, don't reload
        return prev
      }
      return updateNodeInTree(prev, taxid, (n) => ({ ...n, isLoading: true }))
    })

    try {
      // Fetch children from API
      const childrenData = await getTaxonChildren(node.taxid)
      const newChildren: TreeNode[] = (childrenData.results || []).map(taxon => ({
        taxid: taxon.taxid,
        scientific_name: taxon.scientific_name || "",
        rank: taxon.rank || "",
        annotations_count: taxon.annotations_count,
        organisms_count: taxon.organisms_count,
        childrenLoaded: false,
        isLoading: false
      }))

      // Update node with children
      setRootNode(prev => {
        if (!prev) return prev
        return updateNodeInTree(prev, node.taxid, (n) => ({
          ...n,
          children: newChildren,
          childrenLoaded: true,
          isLoading: false
        }))
      })
    } catch (error) {
      console.error(`Error loading children for taxon ${node.taxid}:`, error)
      // Mark as loaded even on error
      setRootNode(prev => {
        if (!prev) return prev
        return updateNodeInTree(prev, node.taxid, (n) => ({
          ...n,
          childrenLoaded: true,
          isLoading: false,
          children: undefined
        }))
      })
    } finally {
      setLoadingNodes(prev => {
        const newSet = new Set(prev)
        newSet.delete(taxid)
        return newSet
      })
    }
  }, [updateNodeInTree, findNodeInTree, loadingNodes])

  // Load Eukaryota's children on initial render (Eukaryota itself is not displayed)
  useEffect(() => {
    async function loadEukaryotaChildren() {
      try {
        setLoadingRoot(true)
        const eukaryotaTaxid = "2759" // Eukaryota
        
        // Fetch only Eukaryota's children (we don't display Eukaryota itself)
        const childrenData = await getTaxonChildren(eukaryotaTaxid)
        
        // Convert children to TreeNode - these will be the root nodes
        const children: TreeNode[] = (childrenData.results || []).map(taxon => ({
          taxid: taxon.taxid,
          scientific_name: taxon.scientific_name || "",
          rank: taxon.rank || "",
          annotations_count: taxon.annotations_count,
          organisms_count: taxon.organisms_count,
          childrenLoaded: false,
          isLoading: false
        }))
        
        // Create a dummy root node to hold the children (not displayed)
        // This allows us to reuse the same tree structure and logic
        const dummyRoot: TreeNode = {
          taxid: "2759", // Eukaryota taxid (not displayed)
          scientific_name: "Eukaryota",
          rank: "superkingdom",
          children: children,
          childrenLoaded: true,
          isLoading: false
        }
        
        setRootNode(dummyRoot)
      } catch (error) {
        console.error("Error loading Eukaryota children:", error)
      } finally {
        setLoadingRoot(false)
      }
    }
    loadEukaryotaChildren()
  }, [])

  // Toggle expansion of a node
  const toggleExpand = useCallback((node: TreeNode) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(node.taxid)) {
      newExpanded.delete(node.taxid)
    } else {
      newExpanded.add(node.taxid)
      // Load children if not loaded and has children
      if (!node.childrenLoaded && hasChildren(node) && !loadingNodes.has(node.taxid)) {
        loadChildren(node)
      }
    }
    setExpandedNodes(newExpanded)
  }, [expandedNodes, setExpandedNodes, loadChildren, loadingNodes])

  // Render a tree node
  const TreeNode = ({ node, level = 0 }: { node: TreeNode; level?: number }) => {
    const isExpanded = expandedNodes.has(node.taxid)
    const isSelected = selectedTaxids.includes(node.taxid)
    const nodeHasChildren = hasChildren(node)
    const isLoading = loadingNodes.has(node.taxid)
    const showChildren = isExpanded && node.children && node.children.length > 0

    return (
      <div className="select-none">
        {/* Node content */}
        <div
          className={cn(
            "flex items-center gap-1 py-1 px-2 rounded text-xs w-full",
            "hover:bg-muted/50 transition-colors",
            isSelected && "bg-primary/10 border border-primary/20",
            level > 0 && "ml-2"
          )}
        >
          {/* Expand/Collapse button */}
          {nodeHasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node)
              }}
              className="flex-shrink-0 w-4 h-4 flex items-center justify-center hover:bg-muted rounded"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4 flex-shrink-0" />
          )}

          {/* Taxon Name */}
          <span
            className={cn(
              "flex-1 truncate text-xs cursor-pointer",
              isSelected ? "font-semibold text-primary" : "text-foreground"
            )}
            title={node.scientific_name}
            onClick={(e) => {
              e.stopPropagation()
              onTaxonToggle(node.taxid)
            }}
          >
            {node.scientific_name}
          </span>

          {/* Rank Badge */}
          {node.rank && (
            <Badge variant="outline" className="text-xs px-1 py-0 h-3.5 capitalize flex-shrink-0">
              {node.rank}
            </Badge>
          )}

          {/* Annotations Count */}
          {node.annotations_count !== undefined && node.annotations_count > 0 && (
            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {node.annotations_count > 9999 
                ? `${(node.annotations_count / 1000).toFixed(1)}k` 
                : node.annotations_count.toLocaleString()}
            </span>
          )}
        </div>

        {/* Children */}
        {showChildren && (
          <div className="ml-2 border-l border-border pl-2">
            {node.children?.map((child) => (
              <TreeNode key={child.taxid} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loadingRoot) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!rootNode || !rootNode.children || rootNode.children.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Unable to load taxonomic tree
      </div>
    )
  }

  // Render only the children of Eukaryota (not Eukaryota itself)
  return (
    <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
      {rootNode.children.map((child) => (
        <TreeNode key={child.taxid} node={child} level={0} />
      ))}
    </div>
  )
}
