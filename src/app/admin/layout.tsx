/**
 * @file layout.tsx
 * @description Admin layout with sidebar, header, breadcrumbs, and route protection
 * @module app/admin
 */

import type { Metadata } from 'next'
import { AdminLayoutShell } from '@/components/layouts/admin-layout-shell'

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>
}
