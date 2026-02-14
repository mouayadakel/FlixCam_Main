/**
 * @file activity page
 * @description Activity feed from audit logs (last 20 events)
 * @module app/admin/(routes)/dashboard/activity
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { Activity } from 'lucide-react'

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

  useEffect(() => {
    fetch('/api/audit-logs?limit=20&offset=0')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load activity')
        return res.json()
      })
      .then((data) => setLogs(data.logs ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">النشاط الأخير</h1>
          <p className="mt-1 text-muted-foreground">سجل الأحداث والتنبيهات على المنصة</p>
        </div>
        <Link
          href="/admin/settings/audit-log"
          className="text-sm font-medium text-primary hover:underline"
        >
          عرض سجل التدقيق الكامل
        </Link>
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
                  <span className="font-medium">{log.action}</span>
                  <span className="text-muted-foreground">
                    {log.resourceType && log.resourceId
                      ? `${log.resourceType} · ${log.resourceId.slice(0, 8)}`
                      : ''}
                  </span>
                  <span className="text-muted-foreground">
                    {log.user?.name || log.user?.email || 'نظام'}
                  </span>
                  <time dateTime={log.timestamp} className="text-muted-foreground">
                    {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', { locale: arSA })}
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
