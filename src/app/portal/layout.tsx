/**
 * @file portal/layout.tsx
 * @description Client portal layout with sidebar navigation
 * @module app/portal
 */

import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PortalSidebar } from '@/components/layouts/portal-sidebar'
import { LogOut } from 'lucide-react'

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
    <div className="flex min-h-screen bg-surface-light" dir="rtl">
      <PortalSidebar />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-light bg-white px-6">
          <Link href="/portal/dashboard" className="text-lg font-bold text-brand-primary">
            FlixCam.rent
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">
              {session.user?.name || session.user?.email}
            </span>
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
        </header>
        <main className="flex-1 px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
