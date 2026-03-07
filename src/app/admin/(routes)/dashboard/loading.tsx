/**
 * @file loading.tsx
 * @description Loading state for dashboard page
 * @module app/admin/(routes)/dashboard
 */

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  )
}
