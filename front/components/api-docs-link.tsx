import Link from 'next/link'
import { FileCode } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ApiDocsLink() {
  return (
    <Link href="/api-docs">
      <Button variant="outline" size="sm" className="gap-2">
        <FileCode className="h-4 w-4" />
        API Docs
      </Button>
    </Link>
  )
}

export function ApiDocsFloatingButton() {
  return (
    <Link href="/api-docs" className="fixed bottom-4 right-4 z-50">
      <Button size="lg" className="gap-2 shadow-lg">
        <FileCode className="h-5 w-5" />
        API Documentation
      </Button>
    </Link>
  )
}

