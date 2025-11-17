import type { TaxonRecord } from '@/lib/api/types'
import type { TreeNode } from '@/lib/stores/taxonomic-tree'

export function buildTree(
  taxid: string,
  data: TaxonRecord,
  childrenData: Map<string, TaxonRecord[]>,
  expandedNodes: Set<string>,
  level: number = 0,
  parent?: TreeNode,
  isRoot = false
): TreeNode {
  const children = childrenData.get(taxid) || []
  const expanded = expandedNodes.has(taxid)

  const node: TreeNode = {
    taxid,
    data: {
      ...data,
      organisms_count: data.organisms_count ?? 0,
      assemblies_count: data.assemblies_count ?? 0,
      annotations_count: data.annotations_count ?? 0,
    },
    children: [],
    level,
    parent,
    isRoot,
  }

  if (expanded && children.length > 0) {
    node.children = children.map((child) => 
      buildTree(child.taxid, child, childrenData, expandedNodes, level + 1, node, false)
    )
  }

  return node
}

export function buildSearchTreeStructure(
  results: TaxonRecord[],
  childrenData: Map<string, TaxonRecord[]>,
  expandedNodes: Set<string>,
): TreeNode[] {
  if (results.length === 0) return []
  
  // Create a map of search results by taxid for quick lookup
  const resultsMap = new Map<string, TaxonRecord>()
  results.forEach(result => {
    resultsMap.set(result.taxid, result)
  })
  
  // Build parent-child relationships between search results
  const childrenMap = new Map<string, TaxonRecord[]>()
  const rootResults: TaxonRecord[] = []
  
  for (const result of results) {
    const resultChildren: TaxonRecord[] = []
    const children = (result.children || []) as TaxonRecord[]
    
    // Check if any child taxid is also in the search results
    for (const child of children) {
      const childTaxid = typeof child === 'string' ? child : child.taxid
      const childResult = resultsMap.get(childTaxid)
      if (childResult) {
        resultChildren.push(childResult)
      }
    }
    
    if (resultChildren.length > 0) {
      childrenMap.set(result.taxid, resultChildren)
    }
    
    // A result is a root if it's not a child of any other result
    let isChild = false
    for (const otherResult of results) {
      if (otherResult.taxid === result.taxid) continue
      const otherChildren = (otherResult.children || []) as TaxonRecord[]
      for (const child of otherChildren) {
        const childTaxid = typeof child === 'string' ? child : child.taxid
        if (childTaxid === result.taxid) {
          isChild = true
          break
        }
      }
      if (isChild) break
    }
    
    if (!isChild) {
      rootResults.push(result)
    }
  }
  
  // If no roots found, use all as roots
  const finalRoots = rootResults.length > 0 ? rootResults : results
  
  // Build tree from roots
  const buildSearchTree = (taxid: string, data: TaxonRecord, level: number = 0, parent?: TreeNode): TreeNode => {
    const node: TreeNode = {
      taxid,
      data,
      children: [],
      level,
      parent,
      isRoot: level === 0,
    }
    
    // Get children from the childrenMap (only search results that are children)
    const searchResultChildren = childrenMap.get(taxid) || []
    
    // Also get direct children from childrenData if expanded
    const directChildren = childrenData.get(taxid) || []
    
    // Combine children, prioritizing search result children, deduplicate by taxid
    const allChildren = [...searchResultChildren, ...directChildren]
    const uniqueChildren = Array.from(
      new Map(allChildren.map(c => [c.taxid, c])).values()
    )
    
    if (expandedNodes.has(taxid) && uniqueChildren.length > 0) {
      node.children = uniqueChildren.map((child) => 
        buildSearchTree(child.taxid, child, level + 1, node)
      )
    }
    
    return node
  }
  
  return finalRoots.map(root => buildSearchTree(root.taxid, root, 0, undefined))
}

export function buildAncestorTree(
  selectedTaxid: string,
  selectedTaxonData: TaxonRecord,
  selectedTaxonAncestors: TaxonRecord[],
  childrenData: Map<string, TaxonRecord[]>,
  expandedNodes: Set<string>,
): TreeNode[] {
  if (!selectedTaxid || !selectedTaxonData || selectedTaxonAncestors.length === 0) {
    return []
  }
  
  let currentParent: TreeNode | undefined = undefined
  let currentLevel = 0
  
  // Build ancestor chain
  const ancestorNodes: TreeNode[] = []
  for (let index = 0; index < selectedTaxonAncestors.length; index++) {
    const ancestor = selectedTaxonAncestors[index]
    const ancestorNode: TreeNode = {
      taxid: ancestor.taxid,
      data: ancestor,
      children: [],
      level: index,
      parent: currentParent,
      isRoot: index === 0,
    }
    if (currentParent) {
      currentParent.children.push(ancestorNode)
    }
    ancestorNodes.push(ancestorNode)
    currentParent = ancestorNode
    currentLevel = index + 1
  }
  
  // Add selected taxon as child of last ancestor
  if (currentParent && selectedTaxonData) {
    const selectedNode: TreeNode = {
      taxid: selectedTaxonData.taxid,
      data: selectedTaxonData,
      children: [],
      level: currentLevel,
      parent: currentParent,
      isRoot: false,
    }
    const parentNode = currentParent as TreeNode
    parentNode.children.push(selectedNode)
    
    // Add children of selected taxon
    const selectedChildren = childrenData.get(selectedTaxid) || []
    if (expandedNodes.has(selectedTaxid) && selectedChildren.length > 0) {
      selectedNode.children = selectedChildren.map((child) => 
        buildTree(child.taxid, child, childrenData, expandedNodes, currentLevel + 1, selectedNode, false)
      )
    }
  }
  
  return ancestorNodes.length > 0 ? [ancestorNodes[0]] : []
}

export function flattenTrees(trees: TreeNode[]): TreeNode[] {
  if (trees.length === 0) return []

  const nodes: TreeNode[] = []
  // Use iterative approach instead of recursive for better performance
  // Reverse trees array before adding to stack to preserve root-level order
  // (since stack.pop() processes from end to beginning)
  const stack: TreeNode[] = [...trees].reverse()
  
  while (stack.length > 0) {
    const node = stack.pop()!
    nodes.push(node)
    // Push children in reverse order to maintain correct order
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push(node.children[i])
    }
  }

  return nodes
}

