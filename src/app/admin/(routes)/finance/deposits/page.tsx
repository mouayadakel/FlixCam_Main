/**
 * @file page.tsx
 * @description Finance – deposit tracking view
 * @module app/admin/(routes)/finance/deposits
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Wallet, RefreshCw, Eye, ArrowLeft } from 'lucide-react'
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

interface DepositItem {
  id: string
  bookingNumber: string
  status: string
  depositAmount: number
  totalAmount: number
  startDate: string
  endDate: string
  createdAt: string
  paidDate: string | null
  depositStatus: 'paid' | 'pending' | 'refunded'
  customer: { id: string; name: string | null; email: string }
}

const DEPOSIT_STATUS_LABELS: Record<string, { ar: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  paid: { ar: 'مدفوع', variant: 'default' },
  pending: { ar: 'قيد الانتظار', variant: 'secondary' },
  refunded: { ar: 'مسترد', variant: 'destructive' },
}

export default function FinanceDepositsPage() {
  const { toast } = useToast()
  const [data, setData] = useState<DepositItem[]>([])
  const [summary, setSummary] = useState<{ totalDepositsHeld: number; pendingDeposits: number; refundedDeposits: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/deposits')
      if (!res.ok) throw new Error('فشل تحميل العربون')
      const json = await res.json()
      setData(json.data ?? [])
      setSummary(json.summary ?? null)
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل العربون', variant: 'destructive' })
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
              <Wallet className="h-8 w-8" />
              العربون
            </h1>
            <p className="text-muted-foreground mt-1">تتبع عربون الحجوزات وحالتها</p>
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
              <CardTitle className="text-sm font-medium">إجمالي العربون المحفوظة</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalDepositsHeld)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">عربون قيد الانتظار</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-amber-600">{formatCurrency(summary.pendingDeposits)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">عربون مستردة</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-muted-foreground">{formatCurrency(summary.refundedDeposits)}</span>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الحجز</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>مبلغ العربون</TableHead>
              <TableHead>حالة العربون</TableHead>
              <TableHead>حالة الحجز</TableHead>
              <TableHead>تاريخ الدفع</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8">
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  لا توجد عربون
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/bookings/${row.id}`} className="text-primary hover:underline">
                      #{row.bookingNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{row.customer.name || row.customer.email}</TableCell>
                  <TableCell>{formatCurrency(row.depositAmount)}</TableCell>
                  <TableCell>
                    <Badge variant={DEPOSIT_STATUS_LABELS[row.depositStatus]?.variant ?? 'secondary'}>
                      {DEPOSIT_STATUS_LABELS[row.depositStatus]?.ar ?? row.depositStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {row.paidDate ? formatDate(row.paidDate) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/bookings/${row.id}`}>
                        <Eye className="h-4 w-4 ml-1" />
                        عرض الحجز
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
