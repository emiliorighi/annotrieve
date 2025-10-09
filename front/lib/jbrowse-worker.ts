// Singleton worker instance that's created once and reused
let workerInstance: Worker | null = null

export function getJBrowseWorker(): Worker {
  if (!workerInstance && typeof window !== 'undefined') {
    workerInstance = new Worker(new URL('../app/rpcWorker.ts', import.meta.url))
    console.log('[JBrowse] Worker pre-warmed and ready')
  }
  return workerInstance!
}

export function terminateJBrowseWorker(): void {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
    console.log('[JBrowse] Worker terminated')
  }
}

// Pre-warm the worker on module load (only in browser)
if (typeof window !== 'undefined') {
  // Use requestIdleCallback to pre-warm during idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      getJBrowseWorker()
    })
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      getJBrowseWorker()
    }, 100)
  }
}

