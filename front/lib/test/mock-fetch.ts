/**
 * Minimal fetch stub for node:test API client tests.
 *
 *   withFetchHandler(() => mockJsonResponse({ ok: true }))
 *   await listFoos()
 *   assert.equal(getFetchCalls()[0].url, "/annotrieve/api/v0/foos")
 *   // afterEach: uninstallFetchMock()
 */
export type FetchCall = {
  url: string
  method: string
  headers: HeadersInit | undefined
  body: BodyInit | null | undefined
}

export type FetchHandler = (
  url: string,
  init?: RequestInit,
) => Response | Promise<Response>

type FetchFn = typeof globalThis.fetch

let previousFetch: FetchFn | undefined
let handler: FetchHandler | undefined
const calls: FetchCall[] = []

function normalizeUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.toString()
  return input.url
}

export function mockJsonResponse(
  body: unknown,
  init?: { status?: number; headers?: HeadersInit },
): Response {
  const status = init?.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(init?.headers),
    json: async () => body,
    blob: async () => new Blob([JSON.stringify(body)]),
    text: async () => JSON.stringify(body),
  } as Response
}

export function mockBlobResponse(
  blob: Blob,
  init?: { status?: number; headers?: HeadersInit },
): Response {
  const status = init?.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(init?.headers),
    json: async () => {
      throw new Error("mockBlobResponse: json() not available")
    },
    blob: async () => blob,
    text: async () => blob.text(),
  } as Response
}

export function mockTextResponse(
  text: string,
  init?: { status?: number; headers?: HeadersInit },
): Response {
  const status = init?.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(init?.headers),
    json: async () => JSON.parse(text),
    blob: async () => new Blob([text]),
    text: async () => text,
  } as Response
}

export function getFetchCalls(): FetchCall[] {
  return [...calls]
}

export function clearFetchCalls(): void {
  calls.length = 0
}

export function installFetchMock(nextHandler?: FetchHandler): void {
  if (previousFetch === undefined) {
    previousFetch = globalThis.fetch
  }
  clearFetchCalls()
  handler = nextHandler
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = normalizeUrl(input)
    calls.push({
      url,
      method: (init?.method ?? "GET").toUpperCase(),
      headers: init?.headers,
      body: init?.body,
    })
    if (!handler) {
      throw new Error(`fetch mock installed but no handler for ${url}`)
    }
    return handler(url, init)
  }) as FetchFn
}

export function uninstallFetchMock(): void {
  if (previousFetch !== undefined) {
    globalThis.fetch = previousFetch
  }
  previousFetch = undefined
  handler = undefined
  clearFetchCalls()
}

export function withFetchHandler(nextHandler: FetchHandler): void {
  installFetchMock(nextHandler)
}
