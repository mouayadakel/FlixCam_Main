/**
 * @file content-health-tab.tsx
 * @description Content Health Scanner: gap cards, scan/fill actions, products table
 * @module app/admin/(routes)/ai-dashboard/_components
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ExternalLink, Search } from 'lucide-react'
import type { GapType } from '@/lib/services/content-health.service'
import {
  GAP_LABELS_DETAILED,
  getRelativeTime,
  notifyJobComplete,
  type JobProgress,
} from '../_utils/ai-dashboard.utils'
import { useJobStream } from '@/hooks/use-job-stream'

export function ContentHealthTab() {
  const { toast } = useToast()
  const [scanData, setScanData] = useState<{
    total: number
    byGapType: Record<GapType, number>
    products: Array<{ id: string; name: string; qualityScore: number; missingFields: GapType[] }>
  } | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [allPagesSelected, setAllPagesSelected] = useState(false)
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [fillingRowId, setFillingRowId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [scannedAt, setScannedAt] = useState<string>('')
  const limit = 20

  const [searchTerm, setSearchTerm] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const { data: jobStreamData } = useJobStream(activeJobId, {
    onComplete: (d) => {
      setIsRunning(false)
      setJobProgress(null)
      setActiveJobId(null)
      fetchScan()
      if (d.status === 'COMPLETED') {
        toast({ title: 'تم', description: 'اكتمل الملء' })
        notifyJobComplete(d.processed)
      } else {
        toast({ title: 'فشل', description: 'فشل بعض العناصر', variant: 'destructive' })
      }
    },
    onError: () => {
      setIsRunning(false)
      setJobProgress(null)
      setActiveJobId(null)
    },
  })

  useEffect(() => {
    if (jobStreamData) {
      const status =
        jobStreamData.status === 'COMPLETED'
          ? 'done'
          : jobStreamData.status === 'FAILED'
            ? 'failed'
            : 'running'
      setJobProgress({
        status,
        progress: jobStreamData.progress,
        processed: jobStreamData.processed,
        total: jobStreamData.total,
        errors: jobStreamData.failed,
      })
    }
  }, [jobStreamData])

  const fetchScan = useCallback(async () => {
    setIsScanning(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (debouncedSearch) params.set('q', debouncedSearch)
      const res = await fetch(`/api/admin/ai/content-health?${params.toString()}`)
      if (!res.ok) throw new Error('فشل الفحص')
      const data = await res.json()
      setScanData({ total: data.total, byGapType: data.byGapType, products: data.products ?? [] })
      setScannedAt(data.scannedAt || new Date().toISOString())
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل تحميل البيانات',
        variant: 'destructive',
      })
    } finally {
      setIsScanning(false)
    }
  }, [page, debouncedSearch, toast])

  useEffect(() => {
    fetchScan()
  }, [fetchScan])

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 300)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
  }, [searchTerm])

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(fetchScan, 30000)
    }
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current)
        autoRefreshRef.current = null
      }
    }
  }, [autoRefresh, fetchScan])

  const handleScanAll = async () => {
    setIsScanning(true)
    try {
      await fetchScan()
      setScannedAt(new Date().toISOString())
      toast({ title: 'تم', description: 'تم تحديث الفحص' })
    } finally {
      setIsScanning(false)
    }
  }

  const handleFillAll = async () => {
    setIsRunning(true)
    try {
      const res = await fetch('/api/admin/ai/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fillAll: true }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'فشل البدء')
      }
      const data = await res.json()
      if (data.queued === 0 && data.message) {
        toast({ title: 'تم', description: data.message })
        setIsRunning(false)
      } else {
        setJobProgress({
          status: 'running',
          progress: 0,
          processed: 0,
          total: data.queued ?? 0,
          errors: 0,
        })
        toast({ title: 'تم', description: `تم إدراج ${data.queued} منتج في قائمة المعالجة` })
        if (data.jobId) setActiveJobId(data.jobId)
      }
    } catch (e) {
      setIsRunning(false)
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل تشغيل الملء',
        variant: 'destructive',
      })
    }
  }

  const handleFillSelected = async () => {
    if (allPagesSelected) return handleFillAll()
    if (selectedIds.length === 0) {
      toast({ title: 'تنبيه', description: 'اختر منتجات أولاً', variant: 'destructive' })
      return
    }
    setIsRunning(true)
    try {
      const res = await fetch('/api/admin/ai/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedIds }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'فشل البدء')
      }
      const data = await res.json()
      setSelectedIds([])
      setAllPagesSelected(false)
      if (data.jobId) {
        setJobProgress({
          status: 'running',
          progress: 0,
          processed: 0,
          total: data.queued ?? 0,
          errors: 0,
        })
        setActiveJobId(data.jobId)
      }
      toast({ title: 'تم', description: data.message ?? `تم إدراج ${data.queued} منتج` })
    } catch (e) {
      setIsRunning(false)
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل',
        variant: 'destructive',
      })
    }
  }

  const handleFillOne = async (id: string) => {
    setFillingRowId(id)
    try {
      const res = await fetch('/api/admin/ai/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: [id] }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'فشل الملء')
      toast({ title: 'تم', description: 'تم إدراج المنتج في المعالجة' })
      if (data.jobId) setActiveJobId(data.jobId)
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل الملء',
        variant: 'destructive',
      })
    } finally {
      setFillingRowId(null)
    }
  }

  const toggleSelect = (id: string) => {
    setAllPagesSelected(false)
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const toggleSelectAll = () => {
    if (!scanData?.products.length) return
    setAllPagesSelected(false)
    setSelectedIds((prev) =>
      prev.length === scanData.products.length ? [] : scanData.products.map((p) => p.id)
    )
  }
  const handleSelectAllPages = () => {
    setAllPagesSelected(true)
    if (scanData?.products) setSelectedIds(scanData.products.map((p) => p.id))
  }
  const handleDeselectAllPages = () => {
    setAllPagesSelected(false)
    setSelectedIds([])
  }

  const displayedCount = allPagesSelected ? (scanData?.total ?? 0) : selectedIds.length
  const showSelectAllPagesBanner =
    !allPagesSelected &&
    scanData &&
    scanData.total > limit &&
    selectedIds.length === scanData.products.length &&
    scanData.products.length > 0

  return (
    <div className="space-y-6">
      {/* Gap cards — 2-col mobile, 4-col desktop */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(Object.keys(GAP_LABELS_DETAILED) as GapType[]).map((key) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{GAP_LABELS_DETAILED[key]}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scanData?.byGapType?.[key] ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions bar — stack on mobile */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={handleScanAll}
          disabled={isScanning}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {isScanning && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          فحص الكل
        </Button>
        <Button onClick={handleFillAll} disabled={isRunning} className="w-full gap-2 sm:w-auto">
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>✨</span>}
          ملء ذكي للكل
          {scanData && <span className="text-xs opacity-80">({scanData.total} منتج)</span>}
        </Button>
        <Button
          onClick={handleFillSelected}
          disabled={isRunning || displayedCount === 0}
          variant="secondary"
          className="w-full sm:w-auto"
        >
          {isRunning && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          ملء المحدد ({displayedCount})
        </Button>
        {scannedAt && (
          <span className="text-sm text-muted-foreground">
            آخر فحص: {getRelativeTime(scannedAt)}
          </span>
        )}
        <div className="flex items-center gap-2 sm:mr-auto">
          <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          <Label htmlFor="auto-refresh" className="cursor-pointer text-sm">
            تحديث تلقائي
          </Label>
        </div>
      </div>

      {/* Job progress */}
      {jobProgress && isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">جاري المعالجة...</span>
                <span className="mr-auto text-sm">
                  {jobProgress.processed} / {jobProgress.total} ({jobProgress.progress}%)
                </span>
              </div>
              <Progress value={jobProgress.progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ابحث عن منتج..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Products table */}
      <Card>
        <CardHeader>
          <CardTitle>المنتجات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {showSelectAllPagesBanner && (
            <div className="border-b bg-blue-50 px-4 py-2 text-center text-sm">
              تم تحديد {scanData.products.length} منتجاً في هذه الصفحة.{' '}
              <button className="font-medium text-primary underline" onClick={handleSelectAllPages}>
                تحديد جميع {scanData.total} منتج
              </button>
            </div>
          )}
          {allPagesSelected && (
            <div className="border-b bg-blue-50 px-4 py-2 text-center text-sm">
              تم تحديد جميع {scanData?.total ?? 0} منتج عبر كل الصفحات.{' '}
              <button
                className="font-medium text-primary underline"
                onClick={handleDeselectAllPages}
              >
                إلغاء التحديد
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        scanData?.products.length
                          ? selectedIds.length === scanData.products.length
                          : false
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>الجودة</TableHead>
                  <TableHead>المنتج</TableHead>
                  <TableHead className="hidden sm:table-cell">الناقص</TableHead>
                  <TableHead className="text-left">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanData?.products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(p.id) || allPagesSelected}
                        onCheckedChange={() => toggleSelect(p.id)}
                        disabled={allPagesSelected}
                      />
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          p.qualityScore >= 70
                            ? 'text-green-600'
                            : p.qualityScore >= 40
                              ? 'text-amber-600'
                              : 'text-red-600'
                        }
                      >
                        {p.qualityScore}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="max-w-[120px] truncate sm:max-w-none">{p.name}</span>
                        <Link
                          href={`/admin/inventory/equipment/${p.id}`}
                          target="_blank"
                          className="shrink-0 text-muted-foreground hover:text-primary"
                          title="فتح صفحة المنتج"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {p.missingFields.map((g) => (
                          <Badge key={g} variant="secondary" className="text-xs">
                            {GAP_LABELS_DETAILED[g]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFillOne(p.id)}
                        disabled={isRunning || fillingRowId === p.id}
                      >
                        {fillingRowId === p.id && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
                        {fillingRowId === p.id ? 'جاري...' : 'ملء'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {scanData?.products.length === 0 && !isScanning && (
            <div className="py-8 text-center text-muted-foreground">
              {debouncedSearch
                ? `لا توجد نتائج لـ '${debouncedSearch}'`
                : 'لا توجد منتجات في هذه الصفحة'}
            </div>
          )}
          {scanData && scanData.total > limit && (
            <div className="flex justify-between p-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => p - 1)
                  setAllPagesSelected(false)
                }}
              >
                السابق
              </Button>
              <span className="text-sm text-muted-foreground">
                صفحة {page} من {Math.ceil(scanData.total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(scanData.total / limit)}
                onClick={() => {
                  setPage((p) => p + 1)
                  setAllPagesSelected(false)
                }}
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
