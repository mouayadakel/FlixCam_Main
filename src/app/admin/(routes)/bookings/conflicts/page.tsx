/**
 * @file page.tsx
 * @description Booking conflicts – overlapping date ranges on same equipment
 * @module app/admin/(routes)/bookings/conflicts
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Eye, RefreshCw, Package } from 'lucide-react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils/format.utils'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface ConflictPair {
  equipmentId: string
  equipmentSku: string
  bookingA: { id: string; bookingNumber: string; status: string; startDate: string; endDate: string }
  bookingB: { id: string; bookingNumber: string; status: string; startDate: string; endDate: string }
  overlapStart: string
  overlapEnd: string
  severity: 'hard' | 'soft'
}

export default function BookingConflictsPage() {
  const { toast } = useToast()
  const [conflicts, setConflicts] = useState<ConflictPair[]>([])
  const [loading, setLoading] = useState(true)

  const loadConflicts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bookings/conflicts')
      if (!res.ok) throw new Error('فشل تحميل التعارضات')
      const data = await res.json()
      setConflicts(data.conflicts ?? [])
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل تعارضات الحجوزات', variant: 'destructive' })
      setConflicts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConflicts()
  }, [])

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            تعارضات الحجوزات
          </h1>
          <p className="text-muted-foreground mt-1">
            حجوزات متداخلة على نفس المعدة في نفس الفترة
          </p>
        </div>
        <Button variant="outline" onClick={loadConflicts} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {conflicts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">عدد التعارضات</CardTitle>
            <CardDescription>تعارض صارم: حجزان مؤكدان/نشطان على نفس المعدة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-2xl font-bold text-destructive">{conflicts.filter((c) => c.severity === 'hard').length}</span>
                <span className="text-muted-foreground mr-2">صارم</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-amber-600">{conflicts.filter((c) => c.severity === 'soft').length}</span>
                <span className="text-muted-foreground mr-2">خفيف</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المعدة</TableHead>
              <TableHead>حجز أ</TableHead>
              <TableHead>حجز ب</TableHead>
              <TableHead>فترة التداخل</TableHead>
              <TableHead>الشدة</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8">
                  <div className="flex justify-center">
                    <Skeleton className="h-8 w-3/4" />
                  </div>
                </TableCell>
              </TableRow>
            ) : conflicts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  لا توجد تعارضات
                </TableCell>
              </TableRow>
            ) : (
              conflicts.map((c, idx) => (
                <TableRow key={`${c.equipmentId}-${c.bookingA.id}-${c.bookingB.id}-${idx}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm">{c.equipmentSku}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/bookings/${c.bookingA.id}`} className="text-primary hover:underline font-medium">
                      #{c.bookingA.bookingNumber}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(c.bookingA.startDate)} – {formatDate(c.bookingA.endDate)}
                    </div>
                    <Badge variant="outline" className="mt-1">{c.bookingA.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/bookings/${c.bookingB.id}`} className="text-primary hover:underline font-medium">
                      #{c.bookingB.bookingNumber}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(c.bookingB.startDate)} – {formatDate(c.bookingB.endDate)}
                    </div>
                    <Badge variant="outline" className="mt-1">{c.bookingB.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(c.overlapStart)} – {formatDate(c.overlapEnd)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.severity === 'hard' ? 'destructive' : 'secondary'}>
                      {c.severity === 'hard' ? 'صارم' : 'خفيف'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/bookings/${c.bookingA.id}`}>
                          <Eye className="h-4 w-4 ml-1" /> عرض أ
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/bookings/${c.bookingB.id}`}>
                          <Eye className="h-4 w-4 ml-1" /> عرض ب
                        </Link>
                      </Button>
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
