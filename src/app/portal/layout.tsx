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
import { PortalMobileNav } from '@/components/layouts/portal-mobile-nav'
import { LogOut } from 'lucide-react'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) {
    redirect('/login?callbackUrl=/portal/dashboard')
  }

  return (
    <div className="flex min-h-screen bg-surface-light" dir="rtl">
      <aside className="hidden lg:block">
        <PortalSidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-light bg-white px-4 lg:px-6">
          <Link href="/portal/dashboard" className="truncate text-lg font-bold text-brand-primary">
            FlixCam.rent
          </Link>
          <div className="flex shrink-0 items-center gap-2 lg:gap-4">
            <span className="hidden max-w-[120px] truncate text-sm text-text-muted sm:inline lg:max-w-none">
              {session.user?.name || session.user?.email}
            </span>
            <form
              action={async () => {
                'use server'
                await signOut()
                redirect('/login')
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0"
              >
                <LogOut className="ml-2 h-4 w-4" />
                <span className="hidden lg:inline">تسجيل الخروج</span>
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 pb-24 lg:px-6 lg:py-8 lg:pb-8">{children}</main>
      </div>
      <PortalMobileNav />
    </div>
  )
}
