/**
 * @file vendor/layout.tsx
 * @description Vendor dashboard layout with auth check (VENDOR role, approved vendor)
 */

import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { VendorSidebar } from '@/components/layouts/vendor-sidebar'
import { LogOut } from 'lucide-react'
import { prisma } from '@/lib/db/prisma'

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/vendor/dashboard')
  }

  const vendor = await prisma.vendor.findFirst({
    where: {
      userId: session.user.id,
      deletedAt: null,
      status: 'APPROVED',
    },
  })

  if (!vendor) {
    redirect('/login?error=VendorAccessDenied')
  }

  return (
    <div className="flex min-h-screen bg-surface-light" dir="rtl">
      <VendorSidebar />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-light bg-white px-6">
          <Link href="/vendor/dashboard" className="text-lg font-bold text-brand-primary">
            FlixCam – Vendor
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">
              {vendor.companyName} / {session.user?.name || session.user?.email}
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
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
