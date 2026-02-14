/**
 * @file page.tsx
 * @description Availability & Holds – active soft locks
 * @module app/admin/(routes)/holds
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, RefreshCw, Unlock, Plus, Package, User } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils/format.utils'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface HoldItem {
  id: string
  bookingNumber: string
  status: string
  startDate: string
  endDate: string
  softLockExpiresAt: string | null
  customer: { id: string; name: string | null; email: string }
  equipment: Array<{ equipmentId: string; quantity: number; sku: string; model: string | null }>
}

function timeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return '—'
  const now = Date.now()
  const exp = new Date(expiresAt).getTime()
  const diff = Math.max(0, exp - now)
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} د`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h} س ${m} د`
}

export default function HoldsPage() {
  const { toast } = useToast()
  const [holds, setHolds] = useState<HoldItem[]>([])
  const [summary, setSummary] = useState<{ activeHoldsCount: number; expiringSoonCount: number; totalLockedEquipment: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [releasingId, setReleasingId] = useState<string | null>(null)

  const loadHolds = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/holds')
      if (!res.ok) throw new Error('فشل تحميل الحجوزات المحجوزة')
      const data = await res.json()
      setHolds(data.data ?? [])
      setSummary(data.summary ?? null)
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل الحجوزات المحجوزة', variant: 'destructive' })
      setHolds([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHolds()
    const t = setInterval(loadHolds, 30000)
    return () => clearInterval(t)
  }, [])

  const handleRelease = async (id: string) => {
    setReleasingId(id)
    try {
      const res = await fetch(`/api/holds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release' }),
      })
      if (!res.ok) throw new Error('فشل إلغاء الحجز')
      toast({ title: 'تم', description: 'تم إلغاء الحجز المؤقت' })
      await loadHolds()
    } catch {
      toast({ title: 'خطأ', description: 'فشل إلغاء الحجز', variant: 'destructive' })
    } finally {
      setReleasingId(null)
    }
  }

  const handleExtend = async (id: string) => {
    try {
      const res = await fetch(`/api/holds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend', extendMinutes: 15 }),
      })
      if (!res.ok) throw new Error('فشل تمديد الحجز')
      toast({ title: 'تم', description: 'تم تمديد الحجز 15 دقيقة' })
      await loadHolds()
    } catch {
      toast({ title: 'خطأ', description: 'فشل تمديد الحجز', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            الحجوزات المؤقتة (الاحتياط)
          </h1>
          <p className="text-muted-foreground mt-1">
            حجوزات بمؤقت ولم تكتمل الدفع – انتهاء الاحتياط يحرر المعدة
          </p>
        </div>
        <Button variant="outline" onClick={loadHolds} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">عدد الاحتياطات النشطة</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{summary.activeHoldsCount}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">تنتهي خلال 5 دقائق</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-amber-600">{summary.expiringSoonCount}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المعدات المحجوزة</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{summary.totalLockedEquipment}</span>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الحجز</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>المعدات</TableHead>
              <TableHead>ينتهي في</TableHead>
              <TableHead>المتبقي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8">
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : holds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  لا توجد احتياطات نشطة
                </TableCell>
              </TableRow>
            ) : (
              holds.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/bookings/${h.id}`} className="text-primary hover:underline">
                      #{h.bookingNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {h.customer.name || h.customer.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {h.equipment.map((e) => (
                        <span key={e.equipmentId} className="inline-flex items-center gap-1 text-sm">
                          <Package className="h-3 w-3" />
                          {e.sku}
                          {e.quantity > 1 && ` ×${e.quantity}`}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {h.softLockExpiresAt ? formatDate(h.softLockExpiresAt) : '—'}
                  </TableCell>
                  <TableCell>
                    <span className={h.softLockExpiresAt && new Date(h.softLockExpiresAt).getTime() - Date.now() < 5 * 60 * 1000 ? 'text-destructive font-medium' : ''}>
                      {timeRemaining(h.softLockExpiresAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{h.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExtend(h.id)}
                        disabled={releasingId === h.id}
                      >
                        <Plus className="h-4 w-4 ml-1" />
                        تمديد
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRelease(h.id)}
                        disabled={releasingId === h.id}
                        className="text-destructive hover:text-destructive"
                      >
                        <Unlock className="h-4 w-4 ml-1" />
                        إلغاء الاحتياط
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/bookings/${h.id}`}>عرض</Link>
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
