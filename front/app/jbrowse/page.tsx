"use client"

import { Suspense } from "react"
import JBrowseLinearGenomeViewComponent from "@/components/jbrowse"

interface JBrowsePageProps {
  searchParams: {
    accession?: string
    annotationId?: string
  }
}

function JBrowseContent({ searchParams }: JBrowsePageProps) {
  const { accession, annotationId } = searchParams

  if (!accession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Accession</h1>
          <p className="text-gray-600 mb-4">No assembly accession provided in URL parameters.</p>
          <a 
            href="/" 
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">Annotrieve</h1>
              <span className="text-sm text-muted-foreground">
                Assembly: {accession}
                {annotationId && ` • Annotation: ${annotationId}`}
              </span>
            </div>
            <a 
              href="/" 
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              ← Back to Search
            </a>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        <Suspense 
          fallback={
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading genome browser...</p>
              </div>
            </div>
          }
        >
          <JBrowseLinearGenomeViewComponent 
            accession={accession} 
            annotationId={annotationId} 
          />
        </Suspense>
      </main>
    </div>
  )
}

export default function JBrowsePage({ searchParams }: JBrowsePageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <JBrowseContent searchParams={searchParams} />
    </Suspense>
  )
}
