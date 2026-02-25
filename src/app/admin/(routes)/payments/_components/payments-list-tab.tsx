/**
 * @file payments-list-tab.tsx
 * @description Payments list tab content
 * @module app/admin/(routes)/payments/_components
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Eye, RefreshCw, DollarSign, Clock, XCircle, RotateCcw, Download } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { exportToCSV } from '@/lib/utils/export.utils'
import { useToast } from '@/hooks/use-toast'
import { TablePagination } from '@/components/tables/table-pagination'
import { TableSkeleton } from '@/components/admin/table-skeleton'
import { EmptyState } from '@/components/states/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PaymentStatus } from '@prisma/client'

interface Payment {
  id: string
  bookingId: string
  amount: number
  status: PaymentStatus
  tapTransactionId?: string | null
  tapChargeId?: string | null
  refundAmount?: number | null
  refundReason?: string | null
  booking?: {
    id: string
    bookingNumber: string
    customerId: string
    totalPrice: number
    customer?: {
      id: string
      name: string | null
      email: string
    }
  } | null
  createdAt: string
  updatedAt: string
}

interface PaymentsSummary {
  totalCollected: number
  pendingAmount: number
  failedCount: number
  refundedTotal: number
}

const STATUS_LABELS: Record<
  PaymentStatus,
  { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { ar: 'قيد الانتظار', en: 'Pending', variant: 'outline' },
  PROCESSING: { ar: 'قيد المعالجة', en: 'Processing', variant: 'secondary' },
  SUCCESS: { ar: 'نجح', en: 'Success', variant: 'default' },
  FAILED: { ar: 'فشل', en: 'Failed', variant: 'destructive' },
  REFUNDED: { ar: 'مسترد', en: 'Refunded', variant: 'destructive' },
  PARTIALLY_REFUNDED: { ar: 'مسترد جزئياً', en: 'Partially Refunded', variant: 'secondary' },
}

export default function PaymentsListTab() {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<PaymentsSummary | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const statuses: Array<PaymentStatus | 'all'> = [
    'all',
    'PENDING',
    'PROCESSING',
    'SUCCESS',
    'FAILED',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
  ]

  useEffect(() => {
    loadPayments()
  }, [statusFilter, page, pageSize, dateFrom, dateTo])

  const loadPayments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const response = await fetch(`/api/payments?${params.toString()}`)
      if (!response.ok) {
        throw new Error('فشل تحميل المدفوعات')
      }

      const data = await response.json()
      setPayments(data.data || [])
      setTotal(data.total ?? 0)
      if (data.summary) setSummary(data.summary)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل المدفوعات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = useMemo(() => payments, [payments])

  const getStatusLabel = (status: PaymentStatus) => {
    return STATUS_LABELS[status]?.ar || status
  }

  const getStatusVariant = (status: PaymentStatus) => {
    return STATUS_LABELS[status]?.variant || 'default'
  }

  const handleExportCSV = () => {
    const rows = filteredPayments.map((p) => ({
      id: p.id,
      bookingNumber: p.booking?.bookingNumber ?? '',
      customerName: p.booking?.customer?.name ?? '',
      amount: formatCurrency(p.amount),
      status: getStatusLabel(p.status),
      refundAmount: p.refundAmount != null ? formatCurrency(p.refundAmount) : '',
      createdAt: formatDate(p.createdAt),
    }))
    exportToCSV(rows, `payments-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'id', label: 'المعرف' },
      { key: 'bookingNumber', label: 'رقم الحجز' },
      { key: 'customerName', label: 'العميل' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'status', label: 'الحالة' },
      { key: 'refundAmount', label: 'المسترد' },
      { key: 'createdAt', label: 'تاريخ الإنشاء' },
    ])
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={filteredPayments.length === 0}
        >
          <Download className="ml-2 h-4 w-4" />
          تصدير CSV
        </Button>
        <Button onClick={loadPayments} variant="outline">
          <RefreshCw className="ml-2 h-4 w-4" />
          تحديث
        </Button>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المحصل</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalCollected)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">مبلغ قيد الانتظار</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-amber-600">
                {formatCurrency(summary.pendingAmount)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">فاشلة</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-red-600">{summary.failedCount}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المسترد</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{formatCurrency(summary.refundedTotal)}</span>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div>
          <Label htmlFor="payments-date-from" className="sr-only">
            من تاريخ
          </Label>
          <Input
            id="payments-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-md border border-input"
            aria-label="من تاريخ"
          />
        </div>
        <div>
          <Label htmlFor="payments-date-to" className="sr-only">
            إلى تاريخ
          </Label>
          <Input
            id="payments-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-md border border-input"
            aria-label="إلى تاريخ"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 rounded-md border border-input" aria-label="فلتر الحالة">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status === 'all'
                  ? 'جميع الحالات'
                  : STATUS_LABELS[status as PaymentStatus]?.ar || status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        {loading ? (
          <TableSkeleton
            rowCount={5}
            headers={[
              'رقم الحجز',
              'العميل',
              'المبلغ',
              'طريقة الدفع',
              'الحالة',
              'مبلغ الاسترداد',
              'معرف المعاملة',
              'تاريخ الإنشاء',
              'الإجراءات',
            ]}
          />
        ) : filteredPayments.length === 0 ? (
          <EmptyState
            title="لا توجد مدفوعات"
            description="لم يتم العثور على مدفوعات تطابق الفلتر. المدفوعات تظهر هنا بعد إتمام عمليات الدفع."
            icon={<DollarSign className="h-12 w-12" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الحجز</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>طريقة الدفع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>مبلغ الاسترداد</TableHead>
                <TableHead>معرف المعاملة</TableHead>
                <TableHead>تاريخ الإنشاء</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.booking?.bookingNumber || payment.bookingId}
                  </TableCell>
                  <TableCell>
                    {payment.booking?.customer?.name || payment.booking?.customer?.email || '-'}
                  </TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.tapTransactionId || payment.tapChargeId ? 'Tap / بطاقة' : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(payment.status)}>
                      {getStatusLabel(payment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payment.refundAmount ? (
                      <div>
                        <span className="font-medium text-destructive">
                          {formatCurrency(payment.refundAmount)}
                        </span>
                        {payment.refundReason && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {payment.refundReason}
                          </div>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.tapTransactionId ? (
                      <div className="font-mono text-sm">
                        {payment.tapTransactionId.substring(0, 20)}...
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{formatDate(payment.createdAt)}</TableCell>
                  <TableCell>
                    <Link href={`/admin/payments/${payment.id}`}>
                      <Button size="sm" variant="ghost">
                        <Eye className="ml-1 h-4 w-4" />
                        عرض
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {!loading && total > 0 && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          itemLabel="مدفوعة"
          dir="rtl"
        />
      )}
    </div>
  )
}
