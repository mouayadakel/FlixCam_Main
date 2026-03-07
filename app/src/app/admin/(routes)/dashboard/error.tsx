/**
 * @file error.tsx
 * @description Error boundary for dashboard page
 * @module app/admin/(routes)/dashboard
 */

'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Error</h2>
        <p className="text-gray-600">
          {error.message || 'An error occurred while loading the dashboard'}
        </p>
        <button
          onClick={() => reset()}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
