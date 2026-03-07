'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Calendar,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  ChevronLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'

interface CustomerBooking {
  id: string
  bookingNumber: string
  status: string
  startDate: string
  endDate: string
  totalAmount: number
  vatAmount: number
  depositAmount: number
  createdAt: string
  equipment: Array<{ id: string; sku: string; model: string | null }>
  invoices?: Array<{ id: string; invoiceNumber: string; status: string }>
}

const STATUS_LABELS: Record<
  string,
  {
    ar: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    icon: React.ReactNode
  }
> = {
  PENDING: { ar: 'قيد الانتظار', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
  CONFIRMED: { ar: 'مؤكد', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  ACTIVE: { ar: 'نشط', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  COMPLETED: { ar: 'مكتمل', variant: 'secondary', icon: <CheckCircle className="h-3 w-3" /> },
  CANCELLED: { ar: 'ملغي', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  RETURNED: { ar: 'تم الإرجاع', variant: 'secondary', icon: <CheckCircle className="h-3 w-3" /> },
}

export default function AccountBookingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/account/bookings')
    }
  }, [status, router])

  const loadBookings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('customerId', session!.user!.id as string)
      params.set('limit', '100')
      const res = await fetch(`/api/bookings?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setBookings(data.bookings ?? data.items ?? [])
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (status === 'authenticated') {
      loadBookings()
    }
  }, [status, loadBookings])

  const summary = useMemo(() => {
    const now = new Date()
    return {
      active: bookings.filter((b) => b.status === 'ACTIVE').length,
      upcoming: bookings.filter((b) => b.status === 'CONFIRMED' && new Date(b.startDate) > now)
        .length,
      completed: bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'RETURNED').length,
      totalSpend: bookings
        .filter((b) => b.status !== 'CANCELLED')
        .reduce((s, b) => s + Number(b.totalAmount), 0),
    }
  }, [bookings])

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return bookings
    return bookings.filter((b) => b.status === statusFilter)
  }, [bookings, statusFilter])

  const isLate = (b: CustomerBooking) => b.status === 'ACTIVE' && new Date(b.endDate) < new Date()

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6" dir="rtl">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    )
  }

  if (status === 'unauthenticated') return null

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">حجوزاتي</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مرحباً {session?.user?.name ?? session?.user?.email} — سجل حجوزاتك الكاملة
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/equipment">
            <Package className="ms-2 h-4 w-4" />
            تصفح المعدات
          </Link>
        </Button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-xs text-muted-foreground">نشطة الآن</p>
            <p className={`text-2xl font-bold ${summary.active > 0 ? 'text-green-600' : ''}`}>
              {summary.active}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-xs text-muted-foreground">قادمة</p>
            <p className="text-2xl font-bold text-blue-600">{summary.upcoming}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-xs text-muted-foreground">مكتملة</p>
            <p className="text-2xl font-bold">{summary.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-3 pt-4">
            <p className="text-xs text-muted-foreground">إجمالي الإنفاق</p>
            <p className="text-lg font-bold">{formatCurrency(summary.totalSpend)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {['all', 'PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'الكل' : (STATUS_LABELS[s]?.ar ?? s)}
          </Button>
        ))}
      </div>

      {/* Bookings List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {statusFilter === 'all' ? 'لا توجد حجوزات بعد.' : 'لا توجد حجوزات بهذه الحالة.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => {
            const statusInfo = STATUS_LABELS[booking.status] ?? {
              ar: booking.status,
              variant: 'outline' as const,
              icon: null,
            }
            const late = isLate(booking)
            return (
              <Card key={booking.id} className={late ? 'border-red-200' : ''}>
                <CardContent className="py-4">
                  {late && (
                    <div className="mb-3 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      تأخر في الإرجاع — كان المفترض إرجاع المعدات في {formatDate(booking.endDate)}
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">حجز #{booking.bookingNumber}</span>
                        <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                          {statusInfo.icon}
                          {statusInfo.ar}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(booking.startDate)} — {formatDate(booking.endDate)}
                        </span>
                        {booking.equipment?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {booking.equipment.length} معدة
                          </span>
                        )}
                      </div>
                      {booking.equipment?.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {booking.equipment
                            .slice(0, 3)
                            .map((e) => e.model ?? e.sku)
                            .join('، ')}
                          {booking.equipment.length > 3 && ` +${booking.equipment.length - 3}`}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-lg font-bold">
                        {formatCurrency(Number(booking.totalAmount))}
                      </p>
                      <div className="flex gap-2">
                        {booking.invoices && booking.invoices.length > 0 && (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/account/invoices/${booking.invoices[0].id}`}>
                              <FileText className="ms-1 h-3 w-3" />
                              الفاتورة
                            </Link>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/booking/confirmation/${booking.id}`}>
                            <ChevronLeft className="ms-1 h-3 w-3" />
                            التفاصيل
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
