/**
 * @file layout.tsx
 * @description Admin layout with sidebar, header, and breadcrumbs (Arabic-first, RTL)
 * @module app/admin
 */

import { AdminSidebar } from '@/components/layouts/admin-sidebar'
import { AdminHeader } from '@/components/layouts/admin-header'
import { AdminBreadcrumbs } from '@/components/layouts/admin-breadcrumbs'
import { Suspense } from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-50" dir="rtl">
      {/* Sidebar */}
      <Suspense fallback={<div className="w-64 bg-white border-l" />}>
        <AdminSidebar />
      </Suspense>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 lg:mr-0">
        {/* Header */}
        <Suspense fallback={<div className="h-16 bg-white border-b" />}>
          <AdminHeader />
        </Suspense>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 md:p-6">
            {/* Breadcrumbs */}
            <div className="mb-6">
              <AdminBreadcrumbs />
            </div>
            
            {/* Page Content */}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
