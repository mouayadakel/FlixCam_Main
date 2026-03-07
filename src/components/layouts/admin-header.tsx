/**
 * @file admin-header.tsx
 * @description Admin header/topbar with search, notifications, user menu (Arabic-first, RTL)
 * @module components/layouts
 */

'use client'

import dynamic from 'next/dynamic'
import { Search, Bell, User, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { LanguageSwitcher } from '@/components/public/language-switcher'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { MobileNav } from './mobile-nav'

/** Loaded with ssr: false to avoid Radix-generated ID hydration mismatch. */
const AdminHeaderUserMenu = dynamic(
  () => import('./admin-header-user-menu').then((m) => m.AdminHeaderUserMenu),
  {
    ssr: false,
    loading: () => (
      <Button variant="ghost" className="flex items-center gap-2" aria-label="قائمة المستخدم" type="button">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700">
          <User className="h-4 w-4" />
        </div>
        <span className="hidden text-sm font-medium md:inline">المستخدم</span>
      </Button>
    ),
  }
)

export function AdminHeader() {
  const [notificationsCount, setNotificationsCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/notifications?countOnly=true')
        if (res.ok) {
          const data = await res.json()
          setNotificationsCount(data.unreadCount ?? 0)
        }
      } catch {
        // Silently ignore - user may not be logged in yet
      }
    }
    fetchCount()
  }, [])

  return (
    <header
      className="sticky top-0 z-40 flex h-16 min-h-[64px] items-center gap-2 border-b border-neutral-200 bg-white px-4 shadow-sm md:gap-4"
      dir="rtl"
    >
      {/* Mobile Menu Button - 44px tap target */}
      <div className="flex min-h-[44px] min-w-[44px] items-center justify-center lg:hidden">
        <MobileNav />
      </div>

      {/* Main website link */}
      <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
        <Link href="/">
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">الموقع الرئيسي</span>
        </Link>
      </Button>

      {/* Search - hidden on smallest screens to give room to logo + actions */}
      <div className="relative hidden max-w-md flex-1 sm:block md:max-w-sm">
        <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input placeholder="بحث..." className="pe-10" dir="rtl" />
      </div>

      {/* Right Side - Language, Notifications & User Menu */}
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" asChild aria-label="الإشعارات">
          <Link href="/admin/notifications" aria-label="الإشعارات">
            <Bell className="h-5 w-5" />
            {notificationsCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
              >
                {notificationsCount > 9 ? '9+' : notificationsCount}
              </Badge>
            )}
          </Link>
        </Button>

        {/* User Menu - dynamic with ssr: false to avoid Radix ID hydration mismatch */}
        <AdminHeaderUserMenu />
      </div>
    </header>
  )
}
