"use client"

import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

export default function ApiDocsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <SwaggerUI
          url="/annotrieve/annotrieve-api-specs.yaml"
          docExpansion="list"
          defaultModelsExpandDepth={1}
          defaultModelExpandDepth={1}
          tryItOutEnabled={true}
          requestInterceptor={(req) => {
            // For GitHub Pages, use absolute URLs to avoid CORS issues
            if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
              if (req.url.startsWith('/annotations/') || 
                  req.url.startsWith('/assemblies/') || 
                  req.url.startsWith('/taxons/') || 
                  req.url.startsWith('/organisms/')) {
                req.url = `https://genome.crg.es/annotrieve/api/v0${req.url}`
              }
            }
            return req
          }}
        />
      </div>
    </div>
  )
}