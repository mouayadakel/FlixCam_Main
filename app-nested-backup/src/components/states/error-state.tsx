/**
 * @file error-state.tsx
 * @description Error state component
 * @module components/states
 */

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading data.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border p-12 text-center">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  )
}
