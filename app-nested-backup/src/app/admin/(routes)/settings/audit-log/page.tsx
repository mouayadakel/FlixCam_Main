/**
 * @file page.tsx
 * @description Audit Log Viewer – filters, table, export CSV. Wired to GET /api/audit-logs.
 * @module app/admin/(routes)/settings/audit-log
 */

'use client'

import { Fragment, useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Download, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface AuditLogEntry {
  id: string
  action: string
  userId: string | null
  resourceType: string | null
  resourceId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
  timestamp: string
  user?: { id: string; email: string; name: string | null } | null
}

const RESOURCE_TYPES: { value: string; label: string }[] = [
  { value: 'booking', label: 'حجز' },
  { value: 'payment', label: 'دفع' },
  { value: 'invoice', label: 'فاتورة' },
  { value: 'contract', label: 'عقد' },
  { value: 'user', label: 'مستخدم' },
  { value: 'approval', label: 'موافقة' },
  { value: 'feature_flag', label: 'ميزة' },
  { value: 'equipment', label: 'معدة' },
  { value: 'quote', label: 'عرض سعر' },
]

const RESOURCE_TYPE_AR: Record<string, string> = Object.fromEntries(
  RESOURCE_TYPES.map((r) => [r.value, r.label])
)

function getActionColor(action: string): string {
  if (action.includes('created') || action.includes('signed')) return 'bg-green-100 text-green-800'
  if (action.includes('confirmed') || action.includes('success')) return 'bg-blue-100 text-blue-800'
  if (action.includes('cancelled') || action.includes('deleted') || action.includes('failed'))
    return 'bg-red-100 text-red-800'
  if (action.includes('updated') || action.includes('risk_check'))
    return 'bg-yellow-100 text-yellow-800'
  if (action.includes('refund')) return 'bg-orange-100 text-orange-800'
  return 'bg-gray-100 text-gray-800'
}

function buildResourceLink(resourceType: string | null, resourceId: string | null): string | null {
  if (!resourceId) return null
  const slug = resourceType?.replace(/_/g, '-') ?? 'resource'
  const map: Record<string, string> = {
    booking: 'bookings',
    payment: 'payments',
    invoice: 'invoices',
    contract: 'contracts',
    user: 'users',
    equipment: 'inventory/equipment',
    quote: 'quotes',
  }
  const segment = map[resourceType ?? ''] ?? 'settings'
  return `/admin/${segment}/${resourceId}`
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [actorId, setActorId] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [action, setAction] = useState('')
  const [resourceId, setResourceId] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      if (actorId) params.set('userId', actorId)
      if (resourceType) params.set('resourceType', resourceType)
      if (action) params.set('action', action)
      if (resourceId) params.set('resourceId', resourceId)
      const res = await fetch(`/api/audit-logs?${params}`)
      if (!res.ok) throw new Error('فشل تحميل سجل التدقيق')
      const data = await res.json()
      setLogs(Array.isArray(data.logs) ? data.logs : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تحميل سجل التدقيق')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, actorId, resourceType, action, resourceId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const exportCsv = () => {
    const headers = ['الوقت', 'المستخدم', 'الإجراء', 'نوع المورد', 'معرف المورد', 'البيانات']
    const rows = logs.map((log) => {
      const time = format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')
      const actor = log.user ? log.user.name || log.user.email : (log.userId ?? '—')
      const meta = log.metadata ? JSON.stringify(log.metadata) : ''
      return [time, actor, log.action, log.resourceType ?? '', log.resourceId ?? '', meta]
    })
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">سجل التدقيق</h1>
        <p className="mt-1 text-muted-foreground">
          تتبع الإجراءات والموافقات والاستردادات وتغييرات الحالة
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>الفلاتر</CardTitle>
          <CardDescription>
            نطاق التاريخ، المستخدم، نوع المورد، الإجراء، معرف المورد
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>نوع المورد</Label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">الكل</SelectItem>
                  {RESOURCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الإجراء</Label>
              <Input
                placeholder="مثال: booking.confirmed"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>معرف المورد</Label>
              <Input
                placeholder="معرف المورد"
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>معرف المستخدم (الممثل)</Label>
              <Input
                placeholder="userId"
                value={actorId}
                onChange={(e) => setActorId(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchLogs} disabled={loading}>
              {loading ? (
                <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="ms-2 h-4 w-4" />
              )}
              تطبيق
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={logs.length === 0}>
              <Download className="ms-2 h-4 w-4" />
              تصدير CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-red-800">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>السجلات</CardTitle>
          <CardDescription>الوقت، الممثل، الإجراء، المورد، معاينة البيانات</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>الوقت</TableHead>
                  <TableHead>الممثل</TableHead>
                  <TableHead>الإجراء</TableHead>
                  <TableHead>نوع المورد</TableHead>
                  <TableHead>المورد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">جاري التحميل...</p>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      لا توجد سجلات
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const link = buildResourceLink(log.resourceType, log.resourceId)
                    const isExpanded = expandedId === log.id
                    return (
                      <Fragment key={log.id}>
                        <TableRow>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm')}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.user ? log.user.name || log.user.email : (log.userId ?? '—')}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`font-mono text-xs ${getActionColor(log.action)}`}
                            >
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.resourceType
                              ? (RESOURCE_TYPE_AR[log.resourceType] ?? log.resourceType)
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {link && log.resourceId ? (
                              <Link
                                href={link}
                                className="font-mono text-sm text-primary hover:underline"
                              >
                                {log.resourceId}
                              </Link>
                            ) : (
                              (log.resourceId ?? '—')
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && log.metadata && Object.keys(log.metadata).length > 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/50 p-4">
                              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
