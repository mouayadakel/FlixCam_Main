/**
 * Notification bell icon with unread count badge and dropdown panel.
 * Fetches /api/notifications on mount, polls every 60s when authenticated.
 * Uses Popover, Badge, ScrollArea, and RTL-safe CSS.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const POLL_INTERVAL_MS = 60_000

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: Record<string, unknown> | null
  link: string | null
  read: boolean
  readAt: string | null
  createdAt: string
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

function formatTimeAgo(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffH < 24) return `${diffH} hour${diffH === 1 ? '' : 's'} ago`
  if (diffD < 7) return `${diffD} day${diffD === 1 ? '' : 's'} ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getNotificationLink(n: Notification): string | null {
  if (n.link) return n.link
  const data = n.data as Record<string, unknown> | null
  if (data?.link && typeof data.link === 'string') return data.link
  if (data?.bookingId && typeof data.bookingId === 'string')
    return `/portal/bookings/${data.bookingId}`
  return null
}

function truncateMessage(message: string, maxLength: number): string {
  if (message.length <= maxLength) return message
  return `${message.slice(0, maxLength).trim()}…`
}

export function NotificationBell() {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) {
        setError('Failed to load notifications')
        return
      }
      const data: NotificationsResponse = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
      setError(null)
    } catch {
      setError('Failed to load notifications')
    }
  }, [session?.user])

  const fetchOnMount = useCallback(() => {
    if (!session?.user) return
    setLoading(true)
    setError(null)
    fetch('/api/notifications')
      .then(async (res) => {
        if (!res.ok) {
          setError('Failed to load notifications')
          return
        }
        const data: NotificationsResponse = await res.json()
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unreadCount ?? 0)
      })
      .catch(() => setError('Failed to load notifications'))
      .finally(() => setLoading(false))
  }, [session?.user])

  useEffect(() => {
    if (!session?.user) return
    fetchOnMount()
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [session?.user, fetchOnMount, fetchNotifications])

  useEffect(() => {
    if (open) {
      setLoading(true)
      fetchNotifications().finally(() => setLoading(false))
    }
  }, [open, fetchNotifications])

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' })
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
        )
        setUnreadCount(0)
      }
    } catch {
      // Silent
    }
  }

  const markAsReadAndNavigate = async (n: Notification) => {
    const link = getNotificationLink(n)
    if (!n.read) {
      try {
        await fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' })
      } catch {
        // Silent
      }
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id
            ? { ...item, read: true, readAt: new Date().toISOString() }
            : item
        )
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    setOpen(false)
    if (link) router.push(link)
  }

  if (!session?.user) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 sm:w-96"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto gap-1 px-2 py-1 text-xs"
              onClick={markAllRead}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all as read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[min(20rem,60vh)]">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={cn(
                      'flex w-full gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/50',
                      !n.read && 'bg-primary/5'
                    )}
                    onClick={() => markAsReadAndNavigate(n)}
                  >
                    <span
                      className={cn(
                        'mt-1 h-2 w-2 shrink-0 rounded-full',
                        !n.read ? 'bg-primary' : 'bg-transparent'
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-sm',
                          !n.read ? 'font-semibold' : 'font-normal'
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {truncateMessage(n.message, 120)}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatTimeAgo(n.createdAt)}
                      </p>
                    </div>
                  </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
