/**
 * @file page.tsx
 * @description In-app notifications list – view and manage notifications (Arabic-first, RTL)
 * @module app/admin/(routes)/notifications
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Bell,
  CheckCheck,
  Mail,
  MessageCircle,
  Smartphone,
  RefreshCw,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/utils/format.utils'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  channel: string
  type: string
  title: string
  message: string
  data: Record<string, unknown> | null
  read: boolean
  readAt: string | null
  createdAt: string
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  IN_APP: { label: 'في التطبيق', icon: Bell, color: 'text-blue-600' },
  EMAIL: { label: 'بريد إلكتروني', icon: Mail, color: 'text-green-600' },
  WHATSAPP: { label: 'واتساب', icon: MessageCircle, color: 'text-emerald-600' },
  SMS: { label: 'رسالة نصية', icon: Smartphone, color: 'text-purple-600' },
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  'booking.confirmed': Calendar,
  'booking.cancelled': Calendar,
  'payment.success': DollarSign,
  'payment.failed': DollarSign,
  'contract.signed': FileText,
}

function getTypeIcon(type: string) {
  return TYPE_ICONS[type] ?? AlertCircle
}

export default function NotificationsPage() {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const loadNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filter === 'unread') params.set('unreadOnly', 'true')
      params.set('limit', '50')

      const res = await fetch(`/api/notifications?${params}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to load notifications')
      }

      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل الإشعارات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllRead' }),
      })
      if (!res.ok) throw new Error('Failed to mark as read')
      await loadNotifications()
      toast({
        title: 'تم',
        description: 'تم تعليم جميع الإشعارات كمقروءة',
      })
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل تعليم الإشعارات كمقروءة',
        variant: 'destructive',
      })
    }
  }

  const handleMarkOneRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed to mark as read')
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل تعليم الإشعار كمقروء',
        variant: 'destructive',
      })
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadNotifications()
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">الإشعارات</h1>
          <p className="mt-1 text-muted-foreground">
            عرض وإدارة إشعاراتك من الحجوزات والمدفوعات والعقود
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllRead} disabled={loading}>
              <CheckCheck className="ms-2 h-4 w-4" />
              تعليم الكل كمقروء
            </Button>
          )}
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('ms-2 h-4 w-4', refreshing && 'animate-spin')} />
            تحديث
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
          الكل
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          غير مقروءة
          {unreadCount > 0 && (
            <Badge variant="secondary" className="me-2 h-5 min-w-5 rounded-full px-1.5">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الإشعارات</CardTitle>
          <CardDescription>
            {filter === 'unread' ? `لديك ${unreadCount} إشعار غير مقروء` : 'جميع إشعاراتك'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">لا توجد إشعارات</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter === 'unread'
                  ? 'لا توجد إشعارات غير مقروءة'
                  : 'ستظهر إشعاراتك هنا عند استلامها'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const channelCfg = CHANNEL_CONFIG[n.channel] ?? {
                  label: n.channel,
                  icon: Bell,
                  color: 'text-gray-600',
                }
                const TypeIcon = getTypeIcon(n.type)
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-start gap-4 rounded-lg border p-4 transition-colors',
                      n.read ? 'bg-muted/30' : 'bg-white'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        n.read ? 'bg-muted' : 'bg-primary/10'
                      )}
                    >
                      <TypeIcon
                        className={cn('h-5 w-5', n.read ? 'text-muted-foreground' : 'text-primary')}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className={cn('font-medium', !n.read && 'text-foreground')}>
                            {n.title}
                          </h4>
                          <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                        </div>
                        {!n.read && (
                          <Button variant="ghost" size="sm" onClick={() => handleMarkOneRead(n.id)}>
                            تعليم كمقروء
                          </Button>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <channelCfg.icon className="h-3 w-3" />
                          {channelCfg.label}
                        </span>
                        <span>•</span>
                        <span>{formatDateTime(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
