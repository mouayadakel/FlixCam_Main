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
import { Plus, Eye, Download } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
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
import { TablePagination } from '@/components/tables/table-pagination'
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

const STATUS_LABELS: Record<
  InvoiceStatus,
  { ar: string; en: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
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
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const statuses: Array<InvoiceStatus | 'all'> = [
    'all',
    'draft',
    'sent',
    'paid',
    'overdue',
    'cancelled',
    'partially_paid',
  ]

  const types: Array<InvoiceType | 'all'> = ['all', 'booking', 'deposit', 'refund', 'adjustment']

  useEffect(() => {
    loadInvoices()
  }, [statusFilter, typeFilter, page, pageSize, dateFrom, dateTo])

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const response = await fetch(`/api/invoices?${params.toString()}`)
      if (!response.ok) {
        throw new Error('فشل تحميل الفواتير')
      }

      const data = await response.json()
      setInvoices(data.data || [])
      setTotal(data.total ?? 0)
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
    return (
      invoice.status !== 'paid' &&
      invoice.status !== 'cancelled' &&
      new Date(invoice.dueDate) < new Date()
    )
  }

  const daysOverdue = (invoice: Invoice): number | null => {
    if (!isOverdue(invoice)) return null
    const due = new Date(invoice.dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)
    return Math.floor((today.getTime() - due.getTime()) / 86400000)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredInvoices.map((inv) => inv.id)))
    }
  }
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const CSV_COLUMNS = [
    { key: 'invoiceNumber', label: 'رقم الفاتورة' },
    { key: 'customerName', label: 'العميل' },
    { key: 'type', label: 'النوع' },
    { key: 'status', label: 'الحالة' },
    { key: 'issueDate', label: 'تاريخ الإصدار' },
    { key: 'dueDate', label: 'تاريخ الاستحقاق' },
    { key: 'totalAmount', label: 'الإجمالي' },
    { key: 'paidAmount', label: 'المدفوع' },
    { key: 'remainingAmount', label: 'المتبقي' },
  ] as const

  const toCSVRows = (invoiceList: Invoice[]) =>
    invoiceList.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer.name ?? '',
      type: getTypeLabel(inv.type),
      status: getStatusLabel(inv.status),
      issueDate: formatDate(inv.issueDate),
      dueDate: formatDate(inv.dueDate),
      totalAmount: formatCurrency(inv.totalAmount),
      paidAmount: formatCurrency(inv.paidAmount),
      remainingAmount: formatCurrency(inv.remainingAmount),
    }))

  const exportSelected = () => {
    const toExport = filteredInvoices.filter((inv) => selectedIds.has(inv.id))
    exportToCSV(toCSVRows(toExport), `invoices-selected-${new Date().toISOString().slice(0, 10)}`, [
      ...CSV_COLUMNS,
    ])
  }

  const handleExportCSV = () => {
    exportToCSV(toCSVRows(filteredInvoices), `invoices-${new Date().toISOString().slice(0, 10)}`, [
      ...CSV_COLUMNS,
    ])
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الفواتير</h1>
          <p className="mt-2 text-muted-foreground">إدارة الفواتير والمدفوعات</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="self-center text-sm text-muted-foreground">
                {selectedIds.size} محدد
              </span>
              <Button variant="outline" size="sm" onClick={() => exportSelected()}>
                <Download className="ml-2 h-4 w-4" />
                تصدير المحدد
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                إلغاء التحديد
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredInvoices.length === 0}
          >
            <Download className="ml-2 h-4 w-4" />
            تصدير CSV
          </Button>
          <Button asChild>
            <Link href="/admin/invoices/new">
              <Plus className="ml-2 h-4 w-4" />
              فاتورة جديدة
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="invoices-date-from" className="sr-only">
          من تاريخ
        </Label>
        <Input
          id="invoices-date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 rounded-md border border-input"
          aria-label="من تاريخ"
        />
        <Label htmlFor="invoices-date-to" className="sr-only">
          إلى تاريخ
        </Label>
        <Input
          id="invoices-date-to"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-9 rounded-md border border-input"
          aria-label="إلى تاريخ"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 rounded-md border border-input" aria-label="فلتر الحالة">
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status === 'all'
                  ? 'جميع الحالات'
                  : STATUS_LABELS[status as InvoiceStatus]?.ar || status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 rounded-md border border-input" aria-label="فلتر النوع">
            <SelectValue placeholder="جميع الأنواع" />
          </SelectTrigger>
          <SelectContent>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {type === 'all' ? 'جميع الأنواع' : TYPE_LABELS[type as InvoiceType]?.ar || type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    filteredInvoices.length > 0 && selectedIds.size === filteredInvoices.length
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="تحديد الكل"
                />
              </TableHead>
              <TableHead>رقم الفاتورة</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>أيام التأخر</TableHead>
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
                <TableCell colSpan={11}>
                  <div className="space-y-2 py-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                  لا توجد فواتير
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(invoice.id)}
                      onCheckedChange={() => toggleSelectOne(invoice.id)}
                      aria-label={`تحديد ${invoice.invoiceNumber}`}
                    />
                  </TableCell>
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
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant={STATUS_LABELS[invoice.status]?.variant || 'default'}>
                        {getStatusLabel(invoice.status)}
                      </Badge>
                      {isOverdue(invoice) && (
                        <Badge variant="destructive" className="bg-red-600">
                          متأخر
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {daysOverdue(invoice) !== null ? (
                      <span className="font-medium text-destructive">
                        {daysOverdue(invoice)} يوم
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                  <TableCell>
                    <span className={invoice.paidAmount > 0 ? 'text-green-600' : ''}>
                      {formatCurrency(invoice.paidAmount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        invoice.remainingAmount > 0
                          ? 'font-medium text-orange-600'
                          : 'text-green-600'
                      }
                    >
                      {formatCurrency(invoice.remainingAmount)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/invoices/${invoice.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="ml-1 h-4 w-4" />
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

      {total > 0 && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          itemLabel="فاتورة"
          dir="rtl"
        />
      )}
    </div>
  )
}
