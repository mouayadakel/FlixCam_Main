/**
 * @file layout.tsx
 * @description Admin layout with sidebar, header, breadcrumbs, and route protection
 * @module app/admin
 */

import { AdminSidebar } from '@/components/layouts/admin-sidebar'
import { AdminHeader } from '@/components/layouts/admin-header'
import { AdminBreadcrumbs } from '@/components/layouts/admin-breadcrumbs'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AIFloatingWidget } from '@/components/admin/ai-floating-widget'
import { Suspense } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-50" dir="rtl">
      {/* Sidebar */}
      <Suspense fallback={<div className="w-64 border-s bg-white" />}>
        <AdminSidebar />
      </Suspense>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden lg:me-0">
        {/* Header */}
        <Suspense fallback={<div className="h-16 border-b bg-white" />}>
          <AdminHeader />
        </Suspense>

        {/* Main Content - overflow-x-auto for wide tables on mobile */}
        <main className="flex-1 overflow-x-auto overflow-y-auto">
          <div className="container mx-auto min-w-0 p-4 md:p-6">
            {/* Breadcrumbs */}
            <div className="mb-6">
              <AdminBreadcrumbs />
            </div>

            {/* Page Content - protected by permission based on route */}
            <ProtectedRoute>{children}</ProtectedRoute>
          </div>
        </main>
      </div>
      <AIFloatingWidget />
    </div>
  )
}
