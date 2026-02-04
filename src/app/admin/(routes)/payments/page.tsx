/**
 * @file payments/page.tsx
 * @description Payments list page
 * @module app/admin/(routes)/payments
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Eye, RefreshCw, DollarSign } from 'lucide-react'
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
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { useToast } from '@/hooks/use-toast'
import { TableSkeleton } from '@/components/admin/table-skeleton'
import { EmptyState } from '@/components/states/empty-state'
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

const STATUS_LABELS: Record<PaymentStatus, { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { ar: 'قيد الانتظار', en: 'Pending', variant: 'outline' },
  PROCESSING: { ar: 'قيد المعالجة', en: 'Processing', variant: 'secondary' },
  SUCCESS: { ar: 'نجح', en: 'Success', variant: 'default' },
  FAILED: { ar: 'فشل', en: 'Failed', variant: 'destructive' },
  REFUNDED: { ar: 'مسترد', en: 'Refunded', variant: 'destructive' },
  PARTIALLY_REFUNDED: { ar: 'مسترد جزئياً', en: 'Partially Refunded', variant: 'secondary' },
}

export default function PaymentsPage() {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

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
  }, [statusFilter])

  const loadPayments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('page', '1')
      params.set('pageSize', '50')

      const response = await fetch(`/api/payments?${params.toString()}`)
      if (!response.ok) {
        throw new Error('فشل تحميل المدفوعات')
      }

      const data = await response.json()
      setPayments(data.data || [])
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

  const filteredPayments = useMemo(() => {
    return payments
  }, [payments])

  const getStatusLabel = (status: PaymentStatus) => {
    return STATUS_LABELS[status]?.ar || status
  }

  const getStatusVariant = (status: PaymentStatus) => {
    return STATUS_LABELS[status]?.variant || 'default'
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">المدفوعات</h1>
          <p className="text-muted-foreground mt-2">
            إدارة المدفوعات والاستردادات
          </p>
        </div>
        <Button onClick={loadPayments} variant="outline">
          <RefreshCw className="h-4 w-4 ml-2" />
          تحديث
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === 'all' ? 'جميع الحالات' : STATUS_LABELS[status as PaymentStatus]?.ar || status}
            </option>
          ))}
        </select>
      </div>

      {/* Payments Table */}
      <div className="border rounded-lg">
        {loading ? (
          <TableSkeleton
            rowCount={5}
            headers={['رقم الحجز', 'العميل', 'المبلغ', 'الحالة', 'مبلغ الاسترداد', 'معرف المعاملة', 'تاريخ الإنشاء', 'الإجراءات']}
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
                  <TableCell>
                    <Badge variant={getStatusVariant(payment.status)}>
                      {getStatusLabel(payment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payment.refundAmount ? (
                      <div>
                        <span className="text-destructive font-medium">
                          {formatCurrency(payment.refundAmount)}
                        </span>
                        {payment.refundReason && (
                          <div className="text-xs text-muted-foreground mt-1">
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
                      <div className="text-sm font-mono">
                        {payment.tapTransactionId.substring(0, 20)}...
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{formatDate(payment.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/payments/${payment.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4 ml-1" />
                          عرض
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
