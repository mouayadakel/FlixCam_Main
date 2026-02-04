/**
 * @file portal/layout.tsx
 * @description Client portal layout with navigation
 * @module app/portal
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Receipt,
  LogOut,
  User,
  FolderOpen,
} from 'lucide-react'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login?callbackUrl=/portal/dashboard')
  }

  return (
    <div className="min-h-screen bg-neutral-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/portal/dashboard" className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-primary-600">
                  FlixCam.rent
                </h1>
              </Link>

              <nav className="hidden md:flex items-center gap-6">
                <Link
                  href="/portal/dashboard"
                  className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors"
                >
                  لوحة التحكم
                </Link>
                <Link
                  href="/portal/bookings"
                  className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors"
                >
                  حجوزاتي
                </Link>
                <Link
                  href="/portal/contracts"
                  className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors"
                >
                  العقود
                </Link>
                <Link
                  href="/portal/invoices"
                  className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors"
                >
                  الفواتير
                </Link>
                <Link
                  href="/portal/documents"
                  className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors"
                >
                  المستندات
                </Link>
                <Link
                  href="/portal/profile"
                  className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors"
                >
                  الملف الشخصي
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-neutral-600">
                {session.user?.name || session.user?.email}
              </div>
              <form
                action={async () => {
                  'use server'
                  await signOut()
                  redirect('/login')
                }}
              >
                <Button type="submit" variant="ghost" size="sm">
                  <LogOut className="h-4 w-4 ml-2" />
                  تسجيل الخروج
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
