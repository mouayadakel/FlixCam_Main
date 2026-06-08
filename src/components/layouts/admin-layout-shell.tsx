'use client'

/**
 * Admin shell with locale-aware direction (FIX-030).
 */

import { Suspense } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { AdminSidebar } from '@/components/layouts/admin-sidebar'
import { AdminHeader } from '@/components/layouts/admin-header'
import { AdminBreadcrumbs } from '@/components/layouts/admin-breadcrumbs'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AIFloatingWidget } from '@/components/admin/ai-floating-widget'

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const { dir } = useLocale()

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-50" dir={dir}>
      <Suspense fallback={<div className="w-64 border-s bg-white" />}>
        <AdminSidebar />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden lg:me-0">
        <Suspense fallback={<div className="h-16 border-b bg-white" />}>
          <AdminHeader />
        </Suspense>

        <main className="flex-1 overflow-x-auto overflow-y-auto">
          <div className="container mx-auto min-w-0 p-4 md:p-6">
            <div className="mb-6">
              <AdminBreadcrumbs />
            </div>
            <ProtectedRoute>{children}</ProtectedRoute>
          </div>
        </main>
      </div>
      <AIFloatingWidget />
    </div>
  )
}
