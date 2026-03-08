/**
 * @file global-error.tsx
 * @description Global error boundary for root layout
 * @module app
 */

'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('GlobalError:', error)
    }
  }, [error])

  return (
    <html lang="en" dir="ltr">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
          <div className="max-w-md space-y-4 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Something went wrong!</h2>
            <p className="text-gray-600">{error.message || 'An unexpected error occurred'}</p>
            {error.digest && <p className="text-xs text-gray-400">Error ID: {error.digest}</p>}
            <div className="flex justify-center gap-2">
              <button
                onClick={() => reset()}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
