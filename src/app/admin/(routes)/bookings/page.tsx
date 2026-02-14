/**
 * @file page.tsx
 * @description Bookings list page with real data from API
 * @module app/admin/(routes)/bookings
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, Search, Download } from 'lucide-react'
import { TableFilters } from '@/components/tables/table-filters'
import { SortableTableHead } from '@/components/tables/sortable-table-head'
import { TablePagination } from '@/components/tables/table-pagination'
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
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils/format.utils'
import { exportToCSV } from '@/lib/utils/export.utils'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import type { BookingStatus } from '@prisma/client'

interface Booking {
  id: string
  bookingNumber: string
  status: BookingStatus
  startDate: Date | string
  endDate: Date | string
  totalAmount: number | string
  depositAmount: number | string | null
  vatAmount: number | string
  createdAt: Date | string
  customer: {
    id: string
    name: string | null
    email: string
  }
  equipment?: Array<{
    id: string
    quantity: number
    equipment: {
      id: string
      sku: string
      model: string | null
    }
  }>
}

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  DRAFT: { ar: 'مسودة', en: 'Draft' },
  RISK_CHECK: { ar: 'فحص المخاطر', en: 'Risk Check' },
  PAYMENT_PENDING: { ar: 'انتظار الدفع', en: 'Payment Pending' },
  CONFIRMED: { ar: 'مؤكد', en: 'Confirmed' },
  ACTIVE: { ar: 'نشط', en: 'Active' },
  RETURNED: { ar: 'مرتجع', en: 'Returned' },
  CLOSED: { ar: 'مغلق', en: 'Closed' },
  CANCELLED: { ar: 'ملغي', en: 'Cancelled' },
}

export default function BookingsPage() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const statuses = [
    'All',
    'DRAFT',
    'RISK_CHECK',
    'PAYMENT_PENDING',
    'CONFIRMED',
    'ACTIVE',
    'RETURNED',
    'CLOSED',
    'CANCELLED',
  ]

  useEffect(() => {
    loadBookings()
  }, [statusFilter, page, pageSize, dateFrom, dateTo])

  const loadBookings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'All') params.set('status', statusFilter)
      if (dateFrom) params.set('startDate', dateFrom)
      if (dateTo) params.set('endDate', dateTo)
      params.set('limit', String(pageSize))
      params.set('offset', String((page - 1) * pageSize))

      const response = await fetch(`/api/bookings?${params.toString()}`)
      if (!response.ok) {
        throw new Error('فشل تحميل الحجوزات')
      }

      const data = await response.json()
      setBookings(data.data || [])
      setTotal(data.total || 0)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل الحجوزات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredBookings = useMemo(() => {
    if (!search) return bookings
    const searchLower = search.toLowerCase()
    return bookings.filter(
      (booking) =>
        booking.bookingNumber.toLowerCase().includes(searchLower) ||
        booking.customer.email.toLowerCase().includes(searchLower) ||
        booking.customer.name?.toLowerCase().includes(searchLower)
    )
  }, [bookings, search])

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedBookings.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedBookings.map((b) => b.id)))
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
  const exportSelected = () => {
    const toExport = selectedIds.size ? sortedBookings.filter((b) => selectedIds.has(b.id)) : sortedBookings
    const rows = toExport.map((b) => ({
      bookingNumber: b.bookingNumber,
      customerName: b.customer.name ?? '',
      customerEmail: b.customer.email,
      status: b.status,
      totalAmount: formatAmount(b.totalAmount),
      depositAmount: formatAmount(b.depositAmount),
      startDate: formatDate(b.startDate),
      endDate: formatDate(b.endDate),
      durationDays: getDurationDays(b.startDate, b.endDate),
      equipmentCount: getEquipmentCount(b),
      createdAt: formatDate(b.createdAt),
    }))
    exportToCSV(rows, `bookings-selected-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'bookingNumber', label: 'رقم الحجز' },
      { key: 'customerName', label: 'العميل' },
      { key: 'customerEmail', label: 'البريد' },
      { key: 'status', label: 'الحالة' },
      { key: 'totalAmount', label: 'المبلغ' },
      { key: 'depositAmount', label: 'العهدة' },
      { key: 'startDate', label: 'تاريخ البداية' },
      { key: 'endDate', label: 'تاريخ النهاية' },
      { key: 'durationDays', label: 'المدة (يوم)' },
      { key: 'equipmentCount', label: 'عدد المعدات' },
      { key: 'createdAt', label: 'تاريخ الإنشاء' },
    ])
  }

  const handleSort = (key: string) => {
    setSortBy((prev) => {
      if (prev === key) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortDirection('asc')
      }
      return key
    })
  }
  const sortedBookings = useMemo(() => {
    if (!sortBy) return filteredBookings
    const sorted = [...filteredBookings].sort((a, b) => {
      let aVal: string | number | Date = ''
      let bVal: string | number | Date = ''
      switch (sortBy) {
        case 'bookingNumber':
          aVal = a.bookingNumber ?? ''
          bVal = b.bookingNumber ?? ''
          break
        case 'startDate':
          aVal = new Date(a.startDate).getTime()
          bVal = new Date(b.startDate).getTime()
          break
        case 'endDate':
          aVal = new Date(a.endDate).getTime()
          bVal = new Date(b.endDate).getTime()
          break
        case 'totalAmount':
          aVal = Number(a.totalAmount ?? 0)
          bVal = Number(b.totalAmount ?? 0)
          break
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
        default:
          return 0
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal)
        return sortDirection === 'asc' ? cmp : -cmp
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [filteredBookings, sortBy, sortDirection])

  const getStatusLabel = (status: BookingStatus) => {
    return STATUS_LABELS[status]?.ar || status
  }

  const formatAmount = (amount: number | string | null) => {
    if (!amount) return '0.00'
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return formatCurrency(numAmount)
  }

  const getDurationDays = (start: Date | string, end: Date | string) => {
    const startDate = typeof start === 'string' ? new Date(start) : start
    const endDate = typeof end === 'string' ? new Date(end) : end
    const diff = endDate.getTime() - startDate.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const getPaymentStatusLabel = (status: string) => {
    if (status === 'PAYMENT_PENDING' || status === 'DRAFT' || status === 'RISK_CHECK') return { ar: 'غير مدفوع', variant: 'destructive' as const }
    if (status === 'CONFIRMED' || status === 'ACTIVE' || status === 'RETURNED' || status === 'CLOSED') return { ar: 'مدفوع', variant: 'default' as const }
    if (status === 'CANCELLED') return { ar: 'ملغي', variant: 'secondary' as const }
    return { ar: '—', variant: 'outline' as const }
  }

  const getEquipmentCount = (booking: Booking) => {
    if (!booking.equipment?.length) return '0'
    const total = booking.equipment.reduce((sum, be) => sum + (be.quantity ?? 1), 0)
    return String(total)
  }

  const handleExportCSV = () => {
    const rows = sortedBookings.map((b) => ({
      bookingNumber: b.bookingNumber,
      customerName: b.customer.name ?? '',
      customerEmail: b.customer.email,
      status: b.status,
      totalAmount: formatAmount(b.totalAmount),
      depositAmount: formatAmount(b.depositAmount),
      startDate: formatDate(b.startDate),
      endDate: formatDate(b.endDate),
      durationDays: getDurationDays(b.startDate, b.endDate),
      equipmentCount: getEquipmentCount(b),
      createdAt: formatDate(b.createdAt),
    }))
    exportToCSV(rows, `bookings-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'bookingNumber', label: 'رقم الحجز' },
      { key: 'customerName', label: 'العميل' },
      { key: 'customerEmail', label: 'البريد' },
      { key: 'status', label: 'الحالة' },
      { key: 'totalAmount', label: 'المبلغ' },
      { key: 'depositAmount', label: 'العهدة' },
      { key: 'startDate', label: 'تاريخ البداية' },
      { key: 'endDate', label: 'تاريخ النهاية' },
      { key: 'durationDays', label: 'المدة (يوم)' },
      { key: 'equipmentCount', label: 'عدد المعدات' },
      { key: 'createdAt', label: 'تاريخ الإنشاء' },
    ])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الحجوزات</h1>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground self-center">{selectedIds.size} محدد</span>
              <Button variant="outline" size="sm" onClick={exportSelected}>
                <Download className="h-4 w-4 ml-2" />
                تصدير المحدد
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                إلغاء التحديد
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={sortedBookings.length === 0}>
            <Download className="h-4 w-4 ml-2" />
            تصدير CSV
          </Button>
          <Button asChild>
            <Link href="/admin/bookings/new">
              <Plus className="h-4 w-4 ml-2" />
              حجز جديد
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 pb-4">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
          placeholder="من تاريخ"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
          placeholder="إلى تاريخ"
        />
      </div>

      <TableFilters
        searchPlaceholder="بحث بالرقم، العميل..."
        statusOptions={statuses}
        onSearchChange={(value) => {
          setSearch(value)
          // Debounce search
          setTimeout(() => {
            if (value === search) {
              loadBookings()
            }
          }, 500)
        }}
        onStatusChange={(value) => {
          setStatusFilter(value)
        }}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={sortedBookings.length > 0 && selectedIds.size === sortedBookings.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="تحديد الكل"
                />
              </TableHead>
              <SortableTableHead sortKey="bookingNumber" currentSort={sortBy} direction={sortDirection} onSort={handleSort}>
                رقم الحجز
              </SortableTableHead>
              <TableHead>العميل</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>المعدات</TableHead>
              <TableHead>المدة</TableHead>
              <TableHead>حالة الدفع</TableHead>
              <SortableTableHead sortKey="totalAmount" currentSort={sortBy} direction={sortDirection} onSort={handleSort}>
                المبلغ الإجمالي
              </SortableTableHead>
              <TableHead>العهدة</TableHead>
              <SortableTableHead sortKey="startDate" currentSort={sortBy} direction={sortDirection} onSort={handleSort}>
                تاريخ البداية
              </SortableTableHead>
              <SortableTableHead sortKey="endDate" currentSort={sortBy} direction={sortDirection} onSort={handleSort}>
                تاريخ النهاية
              </SortableTableHead>
              <SortableTableHead sortKey="createdAt" currentSort={sortBy} direction={sortDirection} onSort={handleSort}>
                تاريخ الإنشاء
              </SortableTableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={13}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : sortedBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                  لا توجد حجوزات
                </TableCell>
              </TableRow>
            ) : (
              sortedBookings.map((booking) => {
                const paymentInfo = getPaymentStatusLabel(booking.status)
                return (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(booking.id)}
                        onCheckedChange={() => toggleSelectOne(booking.id)}
                        aria-label={`تحديد ${booking.bookingNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium font-mono">
                      {booking.bookingNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.customer.name || 'بدون اسم'}</div>
                        <div className="text-sm text-muted-foreground">{booking.customer.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(booking.status.toLowerCase())}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getEquipmentCount(booking)}</TableCell>
                    <TableCell>{getDurationDays(booking.startDate, booking.endDate)} يوم</TableCell>
                    <TableCell>
                      <Badge variant={paymentInfo.variant}>{paymentInfo.ar}</Badge>
                    </TableCell>
                    <TableCell>{formatAmount(booking.totalAmount)}</TableCell>
                    <TableCell>{formatAmount(booking.depositAmount)}</TableCell>
                    <TableCell>{formatDate(booking.startDate)}</TableCell>
                    <TableCell>{formatDate(booking.endDate)}</TableCell>
                    <TableCell>{formatDate(booking.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/bookings/${booking.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
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
          itemLabel="حجز"
          dir="rtl"
        />
      )}
    </div>
  )
}
