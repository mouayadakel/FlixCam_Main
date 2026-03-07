/**
 * @file loading.tsx
 * @description Loading state for admin section
 * @module app/admin
 */

export default function AdminLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Loading admin dashboard...</p>
      </div>
    </div>
  )
}
