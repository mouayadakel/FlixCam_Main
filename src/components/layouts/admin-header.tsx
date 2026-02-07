/**
 * @file admin-header.tsx
 * @description Admin header/topbar with search, notifications, user menu (Arabic-first, RTL)
 * @module components/layouts
 */

'use client'

import { Search, Bell, User, LogOut, Settings } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { MobileNav } from './mobile-nav'

export function AdminHeader() {
  const { data: session } = useSession()
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
      className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-neutral-200 bg-white px-4 shadow-sm"
      dir="rtl"
    >
      {/* Mobile Menu Button */}
      <MobileNav />

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder="بحث..."
          className="pr-10"
          dir="rtl"
        />
      </div>

      {/* Right Side - Notifications & User Menu */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link href="/admin/notifications">
            <Bell className="h-5 w-5" />
            {notificationsCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -left-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {notificationsCount > 9 ? '9+' : notificationsCount}
              </Badge>
            )}
          </Link>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <User className="h-4 w-4" />
              </div>
              <span className="hidden md:inline text-sm font-medium">
                {session?.user?.name || session?.user?.email || 'المستخدم'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>حسابي</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/profile">
                <User className="ml-2 h-4 w-4" />
                الملف الشخصي
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <Settings className="ml-2 h-4 w-4" />
                الإعدادات
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-error-600 focus:text-error-600"
            >
              <LogOut className="ml-2 h-4 w-4" />
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
