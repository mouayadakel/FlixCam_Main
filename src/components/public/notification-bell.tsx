/**
 * Notification bell icon with unread count badge and dropdown.
 * Polls /api/notifications?countOnly=true every 30s when authenticated.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Bell, Check, CheckCheck, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: Record<string, any> | null
  read: boolean
  readAt: string | null
  createdAt: string
}

const POLL_INTERVAL = 30_000

export function NotificationBell() {
  const { data: session } = useSession()
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchCount = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/notifications?countOnly=true')
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.unreadCount ?? 0)
      }
    } catch {
      // silent
    }
  }, [session?.user])

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unreadCount ?? 0)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [session?.user])

  // Poll for unread count
  useEffect(() => {
    if (!session?.user) return
    fetchCount()
    const interval = setInterval(fetchCount, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [session?.user, fetchCount])

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {})
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    )
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markAllRead' }),
    }).catch(() => {})
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
    )
    setUnreadCount(0)
  }

  const getNotificationLink = (n: Notification): string | null => {
    const data = n.data as Record<string, any> | null
    if (data?.bookingId) return `/portal/bookings/${data.bookingId}`
    if (data?.link) return data.link
    return null
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'الآن'
    if (diffMin < 60) return `منذ ${diffMin} د`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `منذ ${diffH} س`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `منذ ${diffD} ي`
    return d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
  }

  if (!session?.user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full text-text-heading transition-colors hover:bg-brand-primary/5 hover:text-brand-primary"
        aria-label={
          t('notifications.title') !== 'notifications.title'
            ? t('notifications.title')
            : 'الإشعارات'
        }
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="absolute end-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border-light/60 bg-white shadow-card-elevated sm:w-96"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-light/60 px-4 py-3">
            <h3 className="text-sm font-semibold text-text-heading">الإشعارات</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck className="h-3 w-3" />
                قراءة الكل
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.map((n) => {
                const link = getNotificationLink(n)
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex gap-3 border-b border-border-light/40 px-4 py-3 transition-colors last:border-b-0',
                      !n.read && 'bg-primary/5'
                    )}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bell className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm',
                            !n.read ? 'font-semibold text-text-heading' : 'text-text-body'
                          )}
                        >
                          {n.title}
                        </p>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => markAsRead(n.id)}
                            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-primary"
                            aria-label="تعليم كمقروء"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">{n.message}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-text-muted">
                          {formatTime(n.createdAt)}
                        </span>
                        {link && (
                          <Link
                            href={link}
                            onClick={() => {
                              if (!n.read) markAsRead(n.id)
                              setOpen(false)
                            }}
                            className="flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                          >
                            عرض
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border-light/60 px-4 py-2 text-center">
              <Link
                href="/portal/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-primary hover:underline"
              >
                عرض جميع الإشعارات
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
