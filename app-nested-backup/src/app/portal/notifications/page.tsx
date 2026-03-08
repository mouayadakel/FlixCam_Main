/**
 * @file portal/notifications/page.tsx
 * @description Customer portal – full notifications page with mark read, filter, pagination
 * @module app/portal/notifications
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, Check, CheckCheck, ExternalLink, RefreshCw, Loader2, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/hooks/use-locale'

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

const PAGE_SIZE = 20

export default function PortalNotificationsPage() {
  const { t } = useLocale()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const fetchNotifications = useCallback(
    async (offset = 0, append = false) => {
      if (offset === 0) setLoading(true)
      else setLoadingMore(true)
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        })
        if (filter === 'unread') params.set('unreadOnly', 'true')
        const res = await fetch(`/api/notifications?${params}`)
        if (res.ok) {
          const data = await res.json()
          const items: Notification[] = data.notifications ?? []
          setNotifications((prev) => (append ? [...prev, ...items] : items))
          setUnreadCount(data.unreadCount ?? 0)
          setHasMore(items.length === PAGE_SIZE)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [filter]
  )

  useEffect(() => {
    fetchNotifications(0, false)
  }, [fetchNotifications])

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

  const getLink = (n: Notification): string | null => {
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
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `منذ ${diffH} ساعة`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `منذ ${diffD} يوم`
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
    // Note: relative time strings kept inline as they use Arabic plural rules
  }

  const getTypeIcon = (type: string) => {
    if (type.includes('booking')) return '📋'
    if (type.includes('payment')) return '💳'
    if (type.includes('contract')) return '📄'
    return '🔔'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('portal.notifications')}</h1>
          <p className="mt-1 text-muted-foreground">
            {unreadCount > 0
              ? t('portal.unreadCount').replace('{count}', String(unreadCount))
              : t('portal.noUnread')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
              <CheckCheck className="h-3.5 w-3.5" />
              {t('portal.markAllRead')}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications(0, false)}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('portal.refresh')}
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          {t('portal.all')}
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
          className="gap-1.5"
        >
          <Filter className="h-3 w-3" />
          {t('portal.unread')}
          {unreadCount > 0 && (
            <Badge className="h-5 min-w-5 justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notifications list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('portal.notifications')}
          </CardTitle>
          <CardDescription>
            {filter === 'unread'
              ? t('portal.unreadNotifications').replace('{count}', String(notifications.length))
              : t('portal.notificationCount').replace('{count}', String(notifications.length))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 rounded-lg border p-4">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground">
                {t('portal.noNotifications')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter === 'unread' ? t('portal.allRead') : t('portal.notificationsWillAppear')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const link = getLink(n)
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex gap-3 rounded-lg border p-4 transition-colors',
                      !n.read && 'border-primary/20 bg-primary/5'
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                      {getTypeIcon(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={cn(
                            'text-sm',
                            !n.read ? 'font-semibold text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {n.title}
                        </h3>
                        <div className="flex shrink-0 items-center gap-1">
                          {!n.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => markAsRead(n.id)}
                              title={t('portal.markAsRead')}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(n.createdAt)}
                        </span>
                        {link && (
                          <Link
                            href={link}
                            onClick={() => {
                              if (!n.read) markAsRead(n.id)
                            }}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {t('portal.viewDetails')}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                        {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Load more */}
              {hasMore && (
                <div className="pt-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNotifications(notifications.length, true)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : null}
                    {t('portal.loadMore')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
