/**
 * @file analytics-tab.tsx
 * @description Job history table + cost chart + KPIs + filters + CSV export
 * @module app/admin/(routes)/ai-dashboard/_components
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Download, CheckCircle2, XCircle, ListTodo, DollarSign } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'
import {
  JOB_TYPE_LABELS,
  JOB_STATUS_LABELS,
  normalizeJobStatus,
  exportJobsToCSV,
} from '../_utils/ai-dashboard.utils'

interface AiJobRow {
  id: string
  type: string
  status: string
  total?: number
  totalItems?: number
  processed: number
  errors?: number
  failed?: number
  costUsd: number | null
  startedAt: string
  completedAt: string | null
}

interface JobsMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  aggregates: {
    totalCost: number
    totalProcessed: number
    totalSucceeded: number
    totalFailed: number
    completedCount: number
    avgCostPerJob: number
  }
}

interface ProviderStatsRow {
  provider: string
  totalJobs: number
  avgCost: number
  totalCost: number
  approvalRate: number
  avgProcessingTime: number
  errorRate: number
}

const JOB_TYPES = ['FULL_BACKFILL', 'TEXT_BACKFILL', 'PHOTO_BACKFILL', 'SPEC_BACKFILL'] as const
const STATUS_TO_API: Record<string, string> = {
  done: 'COMPLETED',
  failed: 'FAILED',
  running: 'RUNNING',
  pending: 'PENDING',
}

export function AnalyticsTab() {
  const [jobs, setJobs] = useState<AiJobRow[]>([])
  const [meta, setMeta] = useState<JobsMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 30

  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [providerStats, setProviderStats] = useState<ProviderStatsRow[]>([])
  const debouncedType = useDebounce(typeFilter, 300)
  const debouncedStatus = useDebounce(statusFilter, 300)

  useEffect(() => {
    async function loadProviders() {
      try {
        const res = await fetch('/api/admin/ai/analytics/providers')
        if (res.ok) {
          const data = await res.json()
          setProviderStats(data.providers ?? [])
        }
      } catch {
        setProviderStats([])
      }
    }
    loadProviders()
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: String(limit), page: String(page) })
        if (debouncedType !== 'all') params.set('type', debouncedType)
        if (debouncedStatus !== 'all')
          params.set('status', STATUS_TO_API[debouncedStatus] ?? debouncedStatus)
        const res = await fetch(`/api/admin/ai/jobs?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setJobs(data.jobs ?? [])
          setMeta(data.meta ?? null)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page, debouncedType, debouncedStatus])

  const totalJobs = meta?.total ?? 0
  const doneJobs = meta?.aggregates?.completedCount ?? 0
  const failedJobs = meta?.aggregates?.totalFailed ?? 0
  const totalCost = meta?.aggregates?.totalCost ?? 0
  const totalPages = meta?.totalPages ?? 1

  const chartData = useMemo(() => {
    const byDate: Record<string, { cost: number; count: number }> = {}
    jobs.forEach((j) => {
      if (j.costUsd != null && j.costUsd > 0) {
        const d = format(new Date(j.startedAt), 'yyyy-MM-dd')
        if (!byDate[d]) byDate[d] = { cost: 0, count: 0 }
        byDate[d].cost += j.costUsd
        byDate[d].count += 1
      }
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { cost, count }]) => ({
        date: format(new Date(date), 'dd/MM', { locale: arSA }),
        cost,
        count,
      }))
  }, [jobs])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المهام</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المهام المكتملة</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{doneJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المهام الفاشلة</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${failedJobs > 0 ? 'text-red-600' : ''}`}>
              {failedJobs}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي التكلفة</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(4)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Comparison */}
      {providerStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>مقارنة مقدمي الخدمة</CardTitle>
            <CardDescription>
              Gemini vs OpenAI — الوظائف، التكلفة، معدل الموافقة، الوقت والأخطاء
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {providerStats.map((p) => (
                <div key={p.provider} className="space-y-2 rounded-lg border bg-muted/30 p-4">
                  <p className="text-lg font-semibold capitalize">{p.provider}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">المهام:</span>
                    <span className="font-medium">{p.totalJobs}</span>
                    <span className="text-muted-foreground">التكلفة:</span>
                    <span className="font-medium">${p.totalCost.toFixed(2)}</span>
                    <span className="text-muted-foreground">معدل الموافقة:</span>
                    <span className="font-medium">{p.approvalRate}%</span>
                    <span className="text-muted-foreground">متوسط الوقت:</span>
                    <span className="font-medium">{p.avgProcessingTime}s</span>
                    <span className="text-muted-foreground">معدل الأخطاء:</span>
                    <span className="font-medium">{p.errorRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost chart */}
      <Card>
        <CardHeader>
          <CardTitle>التكلفة حسب اليوم</CardTitle>
          {chartData.length > 0 && (
            <CardDescription>إجمالي: ${totalCost.toFixed(4)}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  content={({ payload, label }) => {
                    if (!payload?.length) return null
                    const entry = payload[0]?.payload as { cost: number; count: number } | undefined
                    return (
                      <div className="rounded border bg-background p-2 text-sm shadow">
                        <p className="font-medium">{label}</p>
                        <p>التكلفة: {(entry?.cost ?? 0).toFixed(4)} USD</p>
                        <p>عدد المهام: {entry?.count ?? 0}</p>
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#1F87E8"
                  strokeWidth={2}
                  name="التكلفة"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              لا توجد بيانات تكلفة بعد
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job history table */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>سجل المهام</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {JOB_TYPE_LABELS[t] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="done">منتهية</SelectItem>
                <SelectItem value="failed">فشل</SelectItem>
                <SelectItem value="running">جارية</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportJobsToCSV(jobs)}
              className="w-full sm:w-auto"
            >
              <Download className="ml-1 h-4 w-4" />
              تصدير CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوقت</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المُعالَج</TableHead>
                  <TableHead className="hidden sm:table-cell">الأخطاء</TableHead>
                  <TableHead>التكلفة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => {
                  const nStatus = normalizeJobStatus(j.status)
                  return (
                    <TableRow
                      key={j.id}
                      className={nStatus === 'failed' ? 'bg-red-50/50' : undefined}
                    >
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(j.startedAt), 'dd/MM/yyyy HH:mm', { locale: arSA })}
                      </TableCell>
                      <TableCell>{JOB_TYPE_LABELS[j.type] ?? j.type}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            nStatus === 'done'
                              ? 'default'
                              : nStatus === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {JOB_STATUS_LABELS[j.status] ?? j.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {j.processed} / {j.total ?? j.totalItems ?? 0}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {j.failed ?? j.errors ?? 0}
                      </TableCell>
                      <TableCell>
                        {j.costUsd != null ? `${j.costUsd.toFixed(4)} USD` : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {jobs.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">لا توجد مهام حتى الآن</div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-between p-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                السابق
              </Button>
              <span className="text-sm text-muted-foreground">
                صفحة {page} من {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                التالي
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
