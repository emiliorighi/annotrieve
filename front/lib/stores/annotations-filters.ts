import { create } from 'zustand'
import type { AnnotationRecord } from '@/lib/api/types'
import type { AssemblyRecord } from '@/lib/api/types'
import { listAnnotations, getAnnotationsStatsSummary } from '@/lib/api/annotations'
import { listAssemblies } from '@/lib/api/assemblies'

// Filter state interface
export interface FiltersState {
  // Taxon filters
  selectedTaxids: string[]
  
  // Assembly filters
  selectedAssemblyAccessions: string[]
  selectedAssemblyLevels: string[]
  selectedAssemblyStatuses: string[]
  selectedRefseqCategories: string[]
  
  // Annotation metadata filters
  biotypes: string[]
  featureTypes: string[]
  pipelines: string[]
  providers: string[]
  source: string
  mostRecentPerSpecies: boolean
}

// Annotations state interface
export interface AnnotationsState {
  annotations: AnnotationRecord[]
  totalAnnotations: number
  loading: boolean
  error: string | null
  page: number
  itemsPerPage: number
  sortByDate: 'newest' | 'oldest' | 'none'
  stats: any | null
  statsLoading: boolean
  _lastFetchParams: string | null // Cache of last fetch params to prevent duplicate fetches
  _lastFetchTime: number | null // Timestamp of last fetch to prevent rapid duplicate fetches
}

// Assemblies state interface (for browse section)
export interface BrowseAssembliesState {
  assemblies: AssemblyRecord[]
  total: number
  loading: boolean
  error: string | null
  page: number
  itemsPerPage: number
  sortBy: 'release_date' | 'annotations_count'
  sortOrder: 'asc' | 'desc'
  _lastFetchParams: string | null // Cache of last fetch params to prevent duplicate fetches
  _lastFetchTime: number | null // Timestamp of last fetch to prevent rapid duplicate fetches
}

// Combined store interface
export interface AnnotationsFiltersStore extends FiltersState, AnnotationsState {
  browseAssemblies: BrowseAssembliesState
  
  
  // Filter actions
  setSelectedTaxids: (taxids: string[]) => void
  setSelectedAssemblyAccessions: (accessions: string[]) => void
  setSelectedAssemblyLevels: (levels: string[]) => void
  setSelectedAssemblyStatuses: (statuses: string[]) => void
  setSelectedRefseqCategories: (categories: string[]) => void
  setBiotypes: (biotypes: string[]) => void
  setFeatureTypes: (types: string[]) => void
  setPipelines: (pipelines: string[]) => void
  setProviders: (providers: string[]) => void
  setSource: (source: string) => void
  setMostRecentPerSpecies: (value: boolean) => void
  clearAllFilters: () => void
  
  // Annotations actions
  fetchAnnotations: (showFavs?: boolean, favoriteIds?: string[]) => Promise<void>
  fetchAnnotationsStats: (showFavs?: boolean, favoriteIds?: string[]) => Promise<void>
  setAnnotationsPage: (page: number) => void
  setAnnotationsItemsPerPage: (itemsPerPage: number) => void
  setAnnotationsSortByDate: (sortBy: 'newest' | 'oldest' | 'none') => void
  resetAnnotationsPage: () => void
  
  // Browse assemblies actions
  fetchBrowseAssemblies: () => Promise<void>
  setBrowseAssembliesPage: (page: number) => void
  setBrowseAssembliesSort: (sortBy: 'release_date' | 'annotations_count', sortOrder: 'asc' | 'desc') => void
  resetBrowseAssembliesPage: () => void
  
  // Helper methods
  buildAnnotationsParams: (showFavs?: boolean, favoriteIds?: string[]) => Record<string, any>
  buildBrowseAssembliesParams: () => Record<string, any>
  hasActiveFilters: () => boolean
}

// Default values
const defaultFilters: FiltersState = {
  selectedTaxids: [],
  selectedAssemblyAccessions: [],
  selectedAssemblyLevels: [],
  selectedAssemblyStatuses: [],
  selectedRefseqCategories: [],
  biotypes: [],
  featureTypes: [],
  pipelines: [],
  providers: [],
  source: 'all',
  mostRecentPerSpecies: false,
}

const defaultAnnotations: AnnotationsState = {
  annotations: [],
  totalAnnotations: 0,
  loading: false,
  error: null,
  page: 1,
  itemsPerPage: 10,
  sortByDate: 'none',
  stats: null,
  statsLoading: false,
  _lastFetchParams: null,
  _lastFetchTime: null,
}

const defaultBrowseAssemblies: BrowseAssembliesState = {
  assemblies: [],
  total: 0,
  loading: false,
  error: null,
  page: 1,
  itemsPerPage: 5,
  sortBy: 'release_date',
  sortOrder: 'desc',
  _lastFetchParams: null,
  _lastFetchTime: null,
}

export const useAnnotationsFiltersStore = create<AnnotationsFiltersStore>((set, get) => ({
  // Initial state
  ...defaultFilters,
  ...defaultAnnotations,
  browseAssemblies: { ...defaultBrowseAssemblies },
  
  
  // Filter actions (clear fetch cache when filters change to allow new fetches)
  setSelectedTaxids: (taxids: string[]) => {
    set({ 
      selectedTaxids: taxids, 
      _lastFetchParams: null, 
      _lastFetchTime: null,
      browseAssemblies: {
        ...get().browseAssemblies,
        _lastFetchParams: null,
        _lastFetchTime: null,
      },
    })
    get().resetAnnotationsPage()
    get().resetBrowseAssembliesPage()
  },
  
  setSelectedAssemblyAccessions: (accessions: string[]) => {
    set({ 
      selectedAssemblyAccessions: accessions, 
      _lastFetchParams: null, 
      _lastFetchTime: null,
      browseAssemblies: {
        ...get().browseAssemblies,
        _lastFetchParams: null,
        _lastFetchTime: null,
      },
    })
    get().resetAnnotationsPage()
    get().resetBrowseAssembliesPage()
  },
  
  setSelectedAssemblyLevels: (levels: string[]) => {
    set({ 
      selectedAssemblyLevels: levels, 
      _lastFetchParams: null, 
      _lastFetchTime: null,
      browseAssemblies: {
        ...get().browseAssemblies,
        _lastFetchParams: null,
        _lastFetchTime: null,
      },
    })
    get().resetAnnotationsPage()
    get().resetBrowseAssembliesPage()
  },
  
  setSelectedAssemblyStatuses: (statuses: string[]) => {
    set({ 
      selectedAssemblyStatuses: statuses, 
      _lastFetchParams: null, 
      _lastFetchTime: null,
      browseAssemblies: {
        ...get().browseAssemblies,
        _lastFetchParams: null,
        _lastFetchTime: null,
      },
    })
    get().resetAnnotationsPage()
    get().resetBrowseAssembliesPage()
  },
  
  setSelectedRefseqCategories: (categories: string[]) => {
    set({ 
      selectedRefseqCategories: categories, 
      _lastFetchParams: null, 
      _lastFetchTime: null,
      browseAssemblies: {
        ...get().browseAssemblies,
        _lastFetchParams: null,
        _lastFetchTime: null,
      },
    })
    get().resetAnnotationsPage()
    get().resetBrowseAssembliesPage()
  },
  
  setBiotypes: (biotypes: string[]) => {
    set({ biotypes, _lastFetchParams: null, _lastFetchTime: null })
    get().resetAnnotationsPage()
  },
  
  setFeatureTypes: (types: string[]) => {
    set({ featureTypes: types, _lastFetchParams: null, _lastFetchTime: null })
    get().resetAnnotationsPage()
  },
  
  setPipelines: (pipelines: string[]) => {
    set({ pipelines, _lastFetchParams: null, _lastFetchTime: null })
    get().resetAnnotationsPage()
  },
  
  setProviders: (providers: string[]) => {
    set({ providers, _lastFetchParams: null, _lastFetchTime: null })
    get().resetAnnotationsPage()
  },
  
  setSource: (source: string) => {
    set({ source, _lastFetchParams: null, _lastFetchTime: null })
    get().resetAnnotationsPage()
  },
  
  setMostRecentPerSpecies: (value: boolean) => {
    set({ 
      mostRecentPerSpecies: value, 
      _lastFetchParams: null, 
      _lastFetchTime: null,
      browseAssemblies: {
        ...get().browseAssemblies,
        _lastFetchParams: null,
        _lastFetchTime: null,
      },
    })
    get().resetAnnotationsPage()
    get().resetBrowseAssembliesPage()
  },
  
  clearAllFilters: () => {
    set({
      ...defaultFilters,
      _lastFetchParams: null,
      _lastFetchTime: null,
      browseAssemblies: {
        ...defaultBrowseAssemblies,
        _lastFetchParams: null,
        _lastFetchTime: null,
      },
    })
    get().resetAnnotationsPage()
    get().resetBrowseAssembliesPage()
  },
  
  // Build annotations params
  buildAnnotationsParams: (showFavs = false, favoriteIds: string[] = []) => {
    const state = get()
    const params: Record<string, any> = {
      limit: state.itemsPerPage,
      offset: (state.page - 1) * state.itemsPerPage,
    }
    
    // If showing favorites, only use favorite IDs and skip all other filters
    if (showFavs && favoriteIds.length > 0) {
      params.md5_checksums = favoriteIds.join(',')
      params.limit = favoriteIds.length + 1
      // Return early - don't add any other filter params
      return params
    }
    
    // Add taxon filters
    if (state.selectedTaxids.length > 0) {
      params.taxids = state.selectedTaxids.join(',')
    }
    
    // Add assembly filters
    if (state.selectedAssemblyAccessions.length > 0) {
      params.assembly_accessions = state.selectedAssemblyAccessions.join(',')
    }
    if (state.selectedAssemblyLevels.length > 0) {
      params.assembly_levels = state.selectedAssemblyLevels.join(',')
    }
    if (state.selectedAssemblyStatuses.length > 0) {
      params.assembly_statuses = state.selectedAssemblyStatuses.join(',')
    }
    if (state.selectedRefseqCategories.length > 0) {
      params.refseq_categories = state.selectedRefseqCategories.join(',')
    }
    
    // Add annotation metadata filters
    if (state.biotypes.length > 0) {
      params.biotypes = state.biotypes.join(',')
    }
    if (state.featureTypes.length > 0) {
      params.feature_types = state.featureTypes.join(',')
    }
    if (state.pipelines.length > 0) {
      params.pipelines = state.pipelines.join(',')
    }
    if (state.providers.length > 0) {
      params.providers = state.providers.join(',')
    }
    if (state.source && state.source !== 'all') {
      params.db_sources = state.source
    }
    
    // Add most recent per species filter
    if (state.mostRecentPerSpecies) {
      params.latest_release_by = 'organism'
    }
    
    // Add server-side sorting by release date
    if (state.sortByDate !== 'none') {
      params.sort_by = 'source_file_info.release_date'
      params.sort_order = state.sortByDate === 'newest' ? 'desc' : 'asc'
    }
    
    return params
  },
  
  // Build browse assemblies params
  buildBrowseAssembliesParams: () => {
    const state = get()
    const browseState = state.browseAssemblies
    const params: Record<string, any> = {
      limit: browseState.itemsPerPage,
      offset: (browseState.page - 1) * browseState.itemsPerPage,
      sort_by: browseState.sortBy,
      sort_order: browseState.sortOrder,
    }
    
    // Add taxon filters
    if (state.selectedTaxids.length > 0) {
      params.taxids = state.selectedTaxids.join(',')
    }
    
    // Add assembly metadata filters
    if (state.selectedAssemblyLevels.length > 0) {
      params.assembly_levels = state.selectedAssemblyLevels.join(',')
    }
    if (state.selectedAssemblyStatuses.length > 0) {
      params.assembly_statuses = state.selectedAssemblyStatuses.join(',')
    }
    if (state.selectedRefseqCategories.length > 0) {
      params.refseq_categories = state.selectedRefseqCategories.join(',')
    }
    
    return params
  },
  
  // Fetch annotations (without stats)
  fetchAnnotations: async (showFavs = false, favoriteIds: string[] = []) => {
    const state = get()
    
    // Build params and create a cache key
    const params = state.buildAnnotationsParams(showFavs, favoriteIds)
    const paramsKey = JSON.stringify(params)
    const now = Date.now()
    
    // Prevent concurrent fetches
    if (state.loading) {
      return
    }
    
    // Prevent rapid duplicate fetches with the same params (prevents React Strict Mode double fetch)
    // Allow refetch if more than 100ms has passed (handles Strict Mode remounts)
    if (state._lastFetchParams === paramsKey && state._lastFetchTime !== null) {
      const timeSinceLastFetch = now - state._lastFetchTime
      if (timeSinceLastFetch < 100) {
        // Very recent fetch with same params, skip to prevent duplicate
        return
      }
    }
    
    // If showing favorites and no favorites, return early
    if (showFavs && favoriteIds.length === 0) {
      set({
        annotations: [],
        totalAnnotations: 0,
        loading: false,
        _lastFetchParams: paramsKey,
        _lastFetchTime: now,
      })
      return
    }
    
    set({ loading: true, error: null, _lastFetchParams: paramsKey, _lastFetchTime: now })
    
    try {
      // Fetch annotations only
      const res = await listAnnotations(params as any)
      const fetchedAnnotations = (res as any)?.results || []
      const total = (res as any)?.total ?? 0
      
      // Verify this is still the current request (params haven't changed)
      const currentState = get()
      if (currentState._lastFetchParams === paramsKey) {
        set({
          annotations: fetchedAnnotations,
          totalAnnotations: total,
          loading: false,
        })
      } else {
        // Params changed, ignore this result
        set({ loading: false })
      }
    } catch (error: any) {
      // Verify this is still the current request
      const currentState = get()
      if (currentState._lastFetchParams === paramsKey) {
        console.error('Error fetching annotations:', error)
        set({
          annotations: [],
          totalAnnotations: 0,
          error: error?.message || 'Failed to fetch annotations',
          loading: false,
        })
      } else {
        // Params changed, ignore this error
        set({ loading: false })
      }
    }
  },
  
  // Fetch annotations stats (separate function for lazy loading)
  fetchAnnotationsStats: async (showFavs = false, favoriteIds: string[] = []) => {
    const state = get()
    
    // Prevent concurrent fetches
    if (state.statsLoading) {
      return
    }
    
    set({ statsLoading: true, error: null })
    
    try {
      const params = state.buildAnnotationsParams(showFavs, favoriteIds)
      // Remove pagination params for stats
      delete params.limit
      delete params.offset
      
      const statsRes = await getAnnotationsStatsSummary(params as any)
      set({ 
        stats: statsRes, 
        statsLoading: false,
      })
    } catch (statsError: any) {
      console.error('Error fetching stats:', statsError)
      set({ 
        stats: null, 
        statsLoading: false,
        error: statsError?.message || 'Failed to fetch stats',
      })
    }
  },
  
  // Annotations pagination and sorting
  setAnnotationsPage: (page: number) => {
    set({ page, _lastFetchParams: null, _lastFetchTime: null })
  },
  
  setAnnotationsItemsPerPage: (itemsPerPage: number) => {
    set({ itemsPerPage, page: 1, _lastFetchParams: null, _lastFetchTime: null })
  },
  
  setAnnotationsSortByDate: (sortBy: 'newest' | 'oldest' | 'none') => {
    set({ sortByDate: sortBy, _lastFetchParams: null, _lastFetchTime: null })
  },
  
  resetAnnotationsPage: () => {
    set({ page: 1, _lastFetchParams: null, _lastFetchTime: null })
  },
  
  // Fetch browse assemblies
  fetchBrowseAssemblies: async () => {
    const state = get()
    const browseState = state.browseAssemblies
    
    // Build params and create a cache key
    const params = state.buildBrowseAssembliesParams()
    const paramsKey = JSON.stringify(params)
    const now = Date.now()
    
    // Prevent concurrent fetches
    if (browseState.loading) {
      return
    }
    
    // Prevent rapid duplicate fetches with the same params (prevents React Strict Mode double fetch)
    // Allow refetch if more than 100ms has passed (handles Strict Mode remounts)
    if (browseState._lastFetchParams === paramsKey && browseState._lastFetchTime !== null) {
      const timeSinceLastFetch = now - browseState._lastFetchTime
      if (timeSinceLastFetch < 100) {
        // Very recent fetch with same params, skip to prevent duplicate
        return
      }
    }
    
    set({
      browseAssemblies: {
        ...browseState,
        loading: true,
        error: null,
        _lastFetchParams: paramsKey,
        _lastFetchTime: now,
      },
    })
    
    try {
      const res = await listAssemblies(params)
      
      // Verify this is still the current request (params haven't changed)
      const currentState = get()
      if (currentState.browseAssemblies._lastFetchParams === paramsKey) {
        set({
          browseAssemblies: {
            ...currentState.browseAssemblies,
            assemblies: res.results || [],
            total: res.total ?? 0,
            loading: false,
          },
        })
      } else {
        // Params changed, ignore this result
        set({
          browseAssemblies: {
            ...currentState.browseAssemblies,
            loading: false,
          },
        })
      }
    } catch (error: any) {
      // Verify this is still the current request
      const currentState = get()
      if (currentState.browseAssemblies._lastFetchParams === paramsKey) {
        console.error('Error fetching browse assemblies:', error)
        set({
          browseAssemblies: {
            ...currentState.browseAssemblies,
            assemblies: [],
            total: 0,
            error: error?.message || 'Failed to fetch assemblies',
            loading: false,
          },
        })
      } else {
        // Params changed, ignore this error
        set({
          browseAssemblies: {
            ...currentState.browseAssemblies,
            loading: false,
          },
        })
      }
    }
  },
  
  // Browse assemblies pagination and sorting
  setBrowseAssembliesPage: (page: number) => {
    set({
      browseAssemblies: {
        ...get().browseAssemblies,
        page,
        _lastFetchParams: null,
        _lastFetchTime: null,
      },
    })
  },
  
  setBrowseAssembliesSort: (sortBy: 'release_date' | 'annotations_count', sortOrder: 'asc' | 'desc') => {
    set({
      browseAssemblies: {
        ...get().browseAssemblies,
        sortBy,
        sortOrder,
        page: 1, // Reset to first page when sorting changes
        _lastFetchParams: null,
        _lastFetchTime: null,
      },
    })
  },
  
  resetBrowseAssembliesPage: () => {
    set({
      browseAssemblies: {
        ...get().browseAssemblies,
        page: 1,
        _lastFetchParams: null,
        _lastFetchTime: null,
      },
    })
  },
  
  // Helper: check if any filters are active
  hasActiveFilters: () => {
    const state = get()
    return (
      state.selectedTaxids.length > 0 ||
      state.selectedAssemblyAccessions.length > 0 ||
      state.selectedAssemblyLevels.length > 0 ||
      state.selectedAssemblyStatuses.length > 0 ||
      state.selectedRefseqCategories.length > 0 ||
      state.biotypes.length > 0 ||
      state.featureTypes.length > 0 ||
      state.pipelines.length > 0 ||
      state.providers.length > 0 ||
      (state.source && state.source !== 'all') ||
      state.mostRecentPerSpecies
    )
  },
}))

