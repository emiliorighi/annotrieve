"use client"

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import 'swagger-ui-react/swagger-ui.css'

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">API Documentation</h1>
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <div className="container mx-auto py-8">

        <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
          <SwaggerUI
            url="/annotrieve-api-specs.yaml"
            docExpansion="list"
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={1}
            tryItOutEnabled={true}
            requestInterceptor={(req) => {
              // Rewrite API URLs to use Next.js proxy
              if (req.url.includes('genome.crg.es/annotrieve/api/v0')) {
                req.url = req.url.replace('https://genome.crg.es/annotrieve/api/v0', '')
              }
              return req
            }}
          />
        </div>
      </div>
    </div>
  )
}

