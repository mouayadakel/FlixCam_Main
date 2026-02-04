/**
 * @file recent-bookings-table.tsx
 * @description Recent bookings table component
 * @module components/dashboard
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
export interface RecentBookingRow {
  id: string
  booking_number: string
  client_id: string
  client_name: string
  state: string
  start_date: Date
  end_date: Date
  total: number
}

interface RecentBookingsTableProps {
  bookings?: RecentBookingRow[]
}

const STATE_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: '#9CA3AF' },
  risk_check: { label: 'فحص المخاطر', color: '#F59E0B' },
  payment_pending: { label: 'انتظار الدفع', color: '#F59E0B' },
  confirmed: { label: 'مؤكد', color: '#10B981' },
  active: { label: 'نشط', color: '#1F87E8' },
  returned: { label: 'مرتجع', color: '#6366F1' },
  closed: { label: 'مغلق', color: '#6B7280' },
  cancelled: { label: 'ملغي', color: '#EF4444' },
}

export function RecentBookingsTable({ bookings = [] }: RecentBookingsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>الحجوزات الأخيرة</CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="py-12 text-center text-neutral-500">
            لا توجد حجوزات حديثة
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الحجز</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>تاريخ البداية</TableHead>
                <TableHead>تاريخ النهاية</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => {
                const stateConfig = STATE_CONFIG[booking.state] || { label: booking.state, color: '#6B7280' }
                
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-sm">{booking.booking_number}</TableCell>
                    <TableCell>
                      {booking.client_name || `عميل #${booking.client_id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell>
                      {format(new Date(booking.start_date), 'dd/MM/yyyy', { locale: arSA })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(booking.end_date), 'dd/MM/yyyy', { locale: arSA })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {booking.total.toLocaleString('ar-SA')} ر.س
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: stateConfig.color,
                          color: '#fff',
                        }}
                      >
                        {stateConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="text-primary-600 hover:text-primary-700 hover:underline text-sm"
                      >
                        عرض
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
