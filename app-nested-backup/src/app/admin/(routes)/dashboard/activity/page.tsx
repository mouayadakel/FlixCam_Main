/**
 * @file activity page
 * @description Activity feed from audit logs (last 20 events)
 * @module app/admin/(routes)/dashboard/activity
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { Activity, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  booking: 'حجز',
  payment: 'دفعة',
  equipment: 'معدة',
  user: 'مستخدم',
  contract: 'عقد',
  invoice: 'فاتورة',
  role: 'دور',
  vendor: 'مورد',
  studio: 'استوديو',
  category: 'فئة',
  setting: 'إعداد',
}

function getActionColor(action: string): string {
  if (action.includes('created') || action.includes('signed') || action.includes('approved'))
    return 'bg-green-100 text-green-800'
  if (action.includes('deleted') || action.includes('rejected') || action.includes('cancelled'))
    return 'bg-red-100 text-red-800'
  if (action.includes('updated') || action.includes('modified')) return 'bg-blue-100 text-blue-800'
  if (action.includes('login') || action.includes('logout')) return 'bg-purple-100 text-purple-800'
  return 'bg-gray-100 text-gray-800'
}

interface AuditLogEntry {
  id: string
  action: string
  resourceType: string | null
  resourceId: string | null
  timestamp: string
  user?: { id: string; email: string | null; name: string | null } | null
  metadata?: Record<string, unknown>
}

export default function DashboardActivityPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadActivity = () => {
    fetch('/api/audit-logs?limit=20&offset=0')
      .then((res) => {
        if (!res.ok) throw new Error('فشل تحميل النشاط')
        return res.json()
      })
      .then((data) => setLogs(data.logs ?? []))
      .catch((e) => setError(e.message))
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    loadActivity()
  }, [])

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">النشاط الأخير</h1>
          <p className="mt-1 text-muted-foreground">سجل الأحداث والتنبيهات على المنصة</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true)
              loadActivity()
            }}
          >
            <RefreshCw className={`ms-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Link
            href="/admin/settings/audit-log"
            className="text-sm font-medium text-primary hover:underline"
          >
            عرض سجل التدقيق الكامل
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            سجل النشاط
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : error ? (
            <p className="py-8 text-center text-destructive">{error}</p>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">لا توجد أحداث حديثة</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <Badge variant="secondary" className={`text-xs ${getActionColor(log.action)}`}>
                    {log.action}
                  </Badge>
                  {log.resourceType && (
                    <span className="text-muted-foreground">
                      {RESOURCE_TYPE_LABELS[log.resourceType] ?? log.resourceType}
                      {log.resourceId && ` · ${log.resourceId.slice(0, 8)}`}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {log.user?.name || log.user?.email || 'نظام'}
                  </span>
                  <time dateTime={log.timestamp} className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.timestamp), {
                      addSuffix: true,
                      locale: arSA,
                    })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
