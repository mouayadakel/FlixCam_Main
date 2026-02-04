/**
 * @file invoices/page.tsx
 * @description Invoices list page
 * @module app/admin/(routes)/invoices
 * @author Engineering Team
 * @created 2026-01-28
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, FileText, Download, AlertCircle } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import type { InvoiceStatus, InvoiceType } from '@/lib/types/invoice.types'

interface Invoice {
  id: string
  invoiceNumber: string
  bookingId?: string | null
  customerId: string
  type: InvoiceType
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  paidDate?: string | null
  subtotal: number
  discount?: number
  vatAmount: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  customer: {
    id: string
    name: string | null
    email: string
  }
  booking?: {
    id: string
    bookingNumber: string
  } | null
}

const STATUS_LABELS: Record<InvoiceStatus, { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { ar: 'مسودة', en: 'Draft', variant: 'outline' },
  sent: { ar: 'مرسل', en: 'Sent', variant: 'secondary' },
  paid: { ar: 'مدفوع', en: 'Paid', variant: 'default' },
  overdue: { ar: 'متأخر', en: 'Overdue', variant: 'destructive' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', variant: 'destructive' },
  partially_paid: { ar: 'مدفوع جزئياً', en: 'Partially Paid', variant: 'secondary' },
}

const TYPE_LABELS: Record<InvoiceType, { ar: string; en: string }> = {
  booking: { ar: 'حجز', en: 'Booking' },
  deposit: { ar: 'عربون', en: 'Deposit' },
  refund: { ar: 'استرداد', en: 'Refund' },
  adjustment: { ar: 'تسوية', en: 'Adjustment' },
}

export default function InvoicesPage() {
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const statuses: Array<InvoiceStatus | 'all'> = [
    'all',
    'draft',
    'sent',
    'paid',
    'overdue',
    'cancelled',
    'partially_paid',
  ]

  const types: Array<InvoiceType | 'all'> = [
    'all',
    'booking',
    'deposit',
    'refund',
    'adjustment',
  ]

  useEffect(() => {
    loadInvoices()
  }, [statusFilter, typeFilter])

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      params.set('page', '1')
      params.set('pageSize', '50')

      const response = await fetch(`/api/invoices?${params.toString()}`)
      if (!response.ok) {
        throw new Error('فشل تحميل الفواتير')
      }

      const data = await response.json()
      setInvoices(data.data || [])
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل الفواتير',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredInvoices = useMemo(() => {
    return invoices
  }, [invoices])

  const getStatusLabel = (status: InvoiceStatus) => {
    return STATUS_LABELS[status]?.ar || status
  }

  const getTypeLabel = (type: InvoiceType) => {
    return TYPE_LABELS[type]?.ar || type
  }

  const isOverdue = (invoice: Invoice) => {
    return invoice.status !== 'paid' && new Date(invoice.dueDate) < new Date()
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الفواتير</h1>
          <p className="text-muted-foreground mt-2">
            إدارة الفواتير والمدفوعات
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/invoices/new">
            <Plus className="h-4 w-4 ml-2" />
            فاتورة جديدة
          </Link>
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
              {status === 'all' ? 'جميع الحالات' : STATUS_LABELS[status as InvoiceStatus]?.ar || status}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'جميع الأنواع' : TYPE_LABELS[type as InvoiceType]?.ar || type}
            </option>
          ))}
        </select>
      </div>

      {/* Invoices Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الفاتورة</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>المبلغ الإجمالي</TableHead>
              <TableHead>المدفوع</TableHead>
              <TableHead>المتبقي</TableHead>
              <TableHead>تاريخ الاستحقاق</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  لا توجد فواتير
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {invoice.customer.name || invoice.customer.email}
                      </div>
                      {invoice.booking && (
                        <div className="text-sm text-muted-foreground">
                          {invoice.booking.bookingNumber}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getTypeLabel(invoice.type)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_LABELS[invoice.status]?.variant || 'default'}>
                      {getStatusLabel(invoice.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                  <TableCell>
                    <span className={invoice.paidAmount > 0 ? 'text-green-600' : ''}>
                      {formatCurrency(invoice.paidAmount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={invoice.remainingAmount > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                      {formatCurrency(invoice.remainingAmount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(invoice.dueDate)}
                      {isOverdue(invoice) && (
                        <AlertCircle className="h-3 w-3 inline-block ml-1 text-destructive" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/invoices/${invoice.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4 ml-1" />
                          عرض
                        </Button>
                      </Link>
                    </div>
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
