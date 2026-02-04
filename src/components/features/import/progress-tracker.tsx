/**
 * @file progress-tracker.tsx
 * @description Progress tracker component for import jobs
 * @module components/features/import
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, Download, RefreshCw, XCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ProgressData {
  jobId: string
  status: string
  progress: {
    products: {
      total: number
      processed: number
      success: number
      errors: number
      percentage: number
    }
    ai: {
      status: string
      total: number
      processed: number
      failed: number
      cost: number
    } | null
    images: {
      status: string
      total: number
      processed: number
      failed: number
    }
  }
  timestamps: {
    createdAt: string
    updatedAt: string
    estimatedCompletion: string | null
  }
}

interface ProgressTrackerProps {
  jobId: string
  onComplete?: () => void
}

export function ProgressTracker({ jobId, onComplete }: ProgressTrackerProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/admin/imports/${jobId}/progress`)
      if (!res.ok) return
      const data = await res.json()
      setProgress(data)
      setLoading(false)

      // Check if completed
      if (data.status === 'COMPLETED' && onComplete) {
        onComplete()
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error)
    }
  }

  useEffect(() => {
    fetchProgress()
    // Increased interval to 5 seconds to reduce rate limiting issues
    const interval = setInterval(fetchProgress, 5000)
    return () => clearInterval(interval)
  }, [jobId])

  const handleDownloadErrors = async () => {
    try {
      const res = await fetch(`/api/admin/imports/${jobId}/errors.csv`)
      if (!res.ok) throw new Error('Failed to download errors')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `import-errors-${jobId}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({ title: 'Error report downloaded' })
    } catch (error: any) {
      toast({ title: 'Failed to download errors', description: error.message, variant: 'destructive' })
    }
  }

  const handleRetry = async () => {
    try {
      const res = await fetch(`/api/admin/imports/${jobId}/retry`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to retry')
      const data = await res.json()
      toast({ title: 'Retry job created', description: `New job: ${data.jobId}` })
    } catch (error: any) {
      toast({ title: 'Failed to retry', description: error.message, variant: 'destructive' })
    }
  }

  if (loading || !progress) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const { products, ai, images } = progress.progress

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Import Progress</CardTitle>
          <div className="flex gap-2">
            {progress.status === 'COMPLETED' && products.errors > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleDownloadErrors}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Errors
                </Button>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Failed
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Products Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Products</span>
            <Badge variant="outline">
              {products.processed} / {products.total}
            </Badge>
          </div>
          <Progress value={products.percentage} />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>✓ {products.success} success</span>
            {products.errors > 0 && (
              <span className="text-red-600">
                <XCircle className="h-3 w-3 inline mr-1" />
                {products.errors} errors
              </span>
            )}
          </div>
        </div>

        {/* AI Progress */}
        {ai && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">AI Processing</span>
              <Badge variant="outline">
                {ai.processed} / {ai.total}
              </Badge>
            </div>
            <Progress
              value={ai.total > 0 ? Math.round((ai.processed / ai.total) * 100) : 0}
            />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Status: {ai.status}</span>
              {ai.cost > 0 && <span>Cost: ${ai.cost.toFixed(4)}</span>}
              {ai.failed > 0 && (
                <span className="text-red-600">
                  <XCircle className="h-3 w-3 inline mr-1" />
                  {ai.failed} failed
                </span>
              )}
            </div>
          </div>
        )}

        {/* Images Progress */}
        {images.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Image Processing</span>
              <Badge variant="outline">
                {images.processed} / {images.total}
              </Badge>
            </div>
            <Progress
              value={images.total > 0 ? Math.round((images.processed / images.total) * 100) : 0}
            />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Status: {images.status}</span>
              {images.failed > 0 && (
                <span className="text-red-600">
                  <XCircle className="h-3 w-3 inline mr-1" />
                  {images.failed} failed
                </span>
              )}
            </div>
          </div>
        )}

        {/* ETA */}
        {progress.timestamps.estimatedCompletion && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Estimated completion: {new Date(progress.timestamps.estimatedCompletion).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
