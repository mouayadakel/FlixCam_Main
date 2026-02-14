/**
 * @file page.tsx
 * @description Finance – refund tracking view
 * @module app/admin/(routes)/finance/refunds
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RotateCcw, RefreshCw, Eye, ArrowLeft } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface RefundItem {
  id: string
  bookingId: string
  bookingNumber: string | null
  customer: { id: string; name: string | null; email: string } | null
  amount: number
  status: string
  refundAmount: number | null
  refundReason: string | null
  createdAt: string
  updatedAt: string
}

export default function FinanceRefundsPage() {
  const { toast } = useToast()
  const [data, setData] = useState<RefundItem[]>([])
  const [summary, setSummary] = useState<{ totalRefunded: number; pendingRefundRequests: number; thisMonthRefunded: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/refunds')
      if (!res.ok) throw new Error('فشل تحميل الاستردادات')
      const json = await res.json()
      setData(json.data ?? [])
      setSummary(json.summary ?? null)
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل الاستردادات', variant: 'destructive' })
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/finance">
              <ArrowLeft className="h-4 w-4 ml-1" />
              المالية
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <RotateCcw className="h-8 w-8" />
              الاستردادات
            </h1>
            <p className="text-muted-foreground mt-1">تتبع المدفوعات المستردة</p>
          </div>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المسترد</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{formatCurrency(summary.totalRefunded)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">طلبات استرداد قيد الانتظار</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-amber-600">{summary.pendingRefundRequests}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">استردادات هذا الشهر</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">{formatCurrency(summary.thisMonthRefunded)}</span>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>معرف الدفع</TableHead>
              <TableHead>رقم الحجز</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>المبلغ الأصلي</TableHead>
              <TableHead>مبلغ الاسترداد</TableHead>
              <TableHead>سبب الاسترداد</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8">
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  لا توجد استردادات
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">{row.id.slice(0, 8)}…</TableCell>
                  <TableCell>
                    <Link href={`/admin/bookings/${row.bookingId}`} className="text-primary hover:underline">
                      #{row.bookingNumber ?? row.bookingId.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>{row.customer?.name || row.customer?.email || '—'}</TableCell>
                  <TableCell>{formatCurrency(row.amount)}</TableCell>
                  <TableCell className="text-destructive font-medium">
                    {row.refundAmount != null ? formatCurrency(row.refundAmount) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                    {row.refundReason || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'REFUNDED' ? 'destructive' : 'secondary'}>
                      {row.status === 'REFUNDED' ? 'مسترد' : row.status === 'PARTIALLY_REFUNDED' ? 'مسترد جزئياً' : row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(row.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/payments/${row.id}`}>
                        <Eye className="h-4 w-4 ml-1" />
                        عرض
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
