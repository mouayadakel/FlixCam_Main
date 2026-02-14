/**
 * @file recent-bookings page
 * @description Recent bookings list from API (last 10)
 * @module app/admin/(routes)/dashboard/recent-bookings
 */

'use client'

import { useEffect, useState } from 'react'
import { RecentBookingsTable, type RecentBookingRow } from '@/components/dashboard/recent-bookings-table'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

export default function DashboardRecentBookingsPage() {
  const [bookings, setBookings] = useState<RecentBookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/bookings?limit=10&offset=0')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load bookings')
        return res.json()
      })
      .then((data) => {
        const items = data.data ?? []
        const rows: RecentBookingRow[] = items.map((b: any) => ({
          id: b.id,
          booking_number: b.bookingNumber ?? b.booking_number ?? '-',
          client_id: b.customerId ?? b.customer?.id ?? '',
          client_name: b.customer?.name ?? b.customer?.email ?? 'عميل',
          state: (b.status ?? '').toLowerCase(),
          start_date: b.startDate,
          end_date: b.endDate,
          total: Number(b.totalAmount ?? b.total ?? 0),
        }))
        setBookings(rows)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الحجوزات الأخيرة</h1>
          <p className="mt-1 text-muted-foreground">آخر الحجوزات والنشاط</p>
        </div>
        <Link
          href="/admin/bookings"
          className="text-sm font-medium text-primary hover:underline"
        >
          عرض كل الحجوزات
        </Link>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">{error}</CardContent>
        </Card>
      ) : (
        <RecentBookingsTable bookings={bookings} />
      )}
    </div>
  )
}
