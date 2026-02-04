/**
 * @file loading.tsx
 * @description Loading state for dashboard page
 * @module app/admin/(routes)/dashboard
 */

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  )
}
