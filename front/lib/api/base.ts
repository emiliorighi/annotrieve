export type Query = Record<string, string | number | boolean | undefined | null>

// Use relative paths by default so Next.js rewrites proxy API calls in dev
// If you need absolute URLs, set NEXT_PUBLIC_API_BASE (e.g., https://api.example.com)
// For GitHub Pages deployment, use absolute URLs
const API_BASE = 'https://genome.crg.es/annotrieve/api/v0'

export function buildQuery(params: Query = {}): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    usp.set(k, String(v))
  }
  const s = usp.toString()
  return s ? `?${s}` : ''
}

export async function apiGet<T>(path: string, params?: Query, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}${buildQuery(params)}`
  const res = await fetch(url, { ...init, method: 'GET', headers: { 'Accept': 'application/json', ...(init?.headers || {}) } })
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

interface ApiRequestInit extends RequestInit {
  responseType?: 'json' | 'blob'
}

export async function apiPost<T>(path: string, body?: any, params?: Query, init?: ApiRequestInit, responseType?: 'json' | 'blob'): Promise<T> {
  const url = `${API_BASE}${path}${buildQuery(params)}`
  const res = await fetch(url, { ...init, method: 'POST', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  
  // Handle blob responses
  if (responseType === 'blob') {
    return res.blob() as Promise<T>
  }
  
  return res.json() as Promise<T>
}