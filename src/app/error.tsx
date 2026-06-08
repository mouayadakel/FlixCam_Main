/**
 * @file error.tsx
 * @description Root error boundary (catches errors in root layout)
 * @module app
 */

'use client'

import { useEffect, useState } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isRecovering, setIsRecovering] = useState(false)

  useEffect(() => {
    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Root Error:', error)
    }
  }, [error])

  // Check if it's a chunk load error
  const isChunkError =
    error.name === 'ChunkLoadError' ||
    error.message?.includes('Loading chunk') ||
    error.message?.includes('Failed to load chunk')

  const recoverFromChunkError = async () => {
    setIsRecovering(true)

    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys()
        await Promise.all(cacheKeys.map((key) => caches.delete(key)))
      }

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((registration) => registration.unregister()))
      }

      const url = new URL(window.location.href)
      url.searchParams.set('__refresh', Date.now().toString())
      window.location.replace(url.toString())
    } catch {
      window.location.href = `/?__refresh=${Date.now()}`
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="max-w-md space-y-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {isChunkError ? 'New version available!' : 'Something went wrong!'}
        </h2>
        <p className="text-gray-600">
          {isChunkError
            ? 'A new version of the application was deployed. Please reload the page to continue.'
            : error.message || 'An unexpected error occurred'}
        </p>
        {error.digest && <p className="text-xs text-gray-400">Error ID: {error.digest}</p>}
        <div className="flex justify-center gap-2">
          <button
            onClick={() => (isChunkError ? void recoverFromChunkError() : reset())}
            disabled={isRecovering}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {isChunkError ? (isRecovering ? 'Refreshing...' : 'Reload page') : 'Try again'}
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
  )
}
