/**
 * @file page.tsx
 * @description Bookings list page with real data from API
 * @module app/admin/(routes)/bookings
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, Search } from 'lucide-react'
import { TableFilters } from '@/components/tables/table-filters'
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
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils/format.utils'
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
  }, [statusFilter])

  const loadBookings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'All') params.set('status', statusFilter)
      params.set('limit', '50')
      params.set('offset', '0')

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

  const getStatusLabel = (status: BookingStatus) => {
    return STATUS_LABELS[status]?.ar || status
  }

  const formatAmount = (amount: number | string | null) => {
    if (!amount) return '0.00'
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return formatCurrency(numAmount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الحجوزات</h1>
        </div>
        <Button asChild>
          <Link href="/admin/bookings/new">
            <Plus className="h-4 w-4 ml-2" />
            حجز جديد
          </Link>
        </Button>
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
              <TableHead>رقم الحجز</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>المبلغ الإجمالي</TableHead>
              <TableHead>العهدة</TableHead>
              <TableHead>تاريخ البداية</TableHead>
              <TableHead>تاريخ النهاية</TableHead>
              <TableHead>تاريخ الإنشاء</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  لا توجد حجوزات
                </TableCell>
              </TableRow>
            ) : (
              filteredBookings.map((booking) => (
                <TableRow key={booking.id}>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && total > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          عرض {filteredBookings.length} من {total} حجز
        </div>
      )}
    </div>
  )
}
