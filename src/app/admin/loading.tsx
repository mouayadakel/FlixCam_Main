/**
 * @file loading.tsx
 * @description Loading state for admin section
 * @module app/admin
 */

export default function AdminLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600">Loading admin dashboard...</p>
      </div>
    </div>
  )
}
