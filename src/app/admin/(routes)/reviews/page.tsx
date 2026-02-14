/**
 * @file page.tsx
 * @description Reviews list with status filter and link to detail
 * @module app/admin/(routes)/reviews
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Star, Eye, RefreshCw, MessageSquare, Download } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils/format.utils'
import { exportToCSV } from '@/lib/utils/export.utils'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'PENDING_MODERATION', label: 'Pending moderation' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
] as const

interface Review {
  id: string
  bookingId: string
  userId: string
  rating: number
  comment: string | null
  status: string
  equipmentNames?: string | null
  adminResponse: string | null
  respondedAt: string | null
  createdAt: string
  user?: { id: string; name: string | null; email: string }
  booking?: { id: string; bookingNumber: string; status: string; startDate: string; endDate: string }
}

export default function ReviewsPage() {
  const { toast } = useToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)

  useEffect(() => {
    loadReviews()
  }, [statusFilter])

  const loadReviews = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/reviews?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load reviews')
      const data = await res.json()
      setReviews(data.reviews ?? [])
      setAverageRating(typeof data.averageRating === 'number' ? data.averageRating : null)
    } catch {
      toast({ title: 'Error', description: 'Failed to load reviews', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const statusColor: Record<string, string> = {
    PENDING_MODERATION: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === reviews.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(reviews.map((r) => r.id)))
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
    const toExport = selectedIds.size ? reviews.filter((r) => selectedIds.has(r.id)) : reviews
    const rows = toExport.map((r) => ({
      id: r.id,
      bookingNumber: r.booking?.bookingNumber ?? '',
      rating: r.rating,
      comment: (r.comment ?? '').slice(0, 200),
      status: r.status,
      equipmentNames: r.equipmentNames ?? '',
      createdAt: formatDate(r.createdAt),
      userEmail: r.user?.email ?? '',
    }))
    exportToCSV(rows, selectedIds.size ? `reviews-selected-${new Date().toISOString().slice(0, 10)}` : `reviews-${new Date().toISOString().slice(0, 10)}`, [
      { key: 'id', label: 'المعرف' },
      { key: 'bookingNumber', label: 'رقم الحجز' },
      { key: 'rating', label: 'التقييم' },
      { key: 'comment', label: 'التعليق' },
      { key: 'status', label: 'الحالة' },
      { key: 'equipmentNames', label: 'المعدات' },
      { key: 'createdAt', label: 'التاريخ' },
      { key: 'userEmail', label: 'البريد' },
    ])
  }
  const bulkSetStatus = async (status: 'APPROVED' | 'REJECTED') => {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/reviews/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          })
        )
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) {
        toast({ title: 'تنبيه', description: `تم تحديث ${selectedIds.size - failed}، فشل ${failed}`, variant: 'destructive' })
      } else {
        toast({ title: 'تم', description: `تم تحديث ${selectedIds.size} تقييماً` })
      }
      setSelectedIds(new Set())
      loadReviews()
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' })
    } finally {
      setBulkUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Star className="h-8 w-8" />
            Reviews
          </h1>
          <p className="text-muted-foreground mt-1">Customer reviews and ratings; moderate and respond</p>
        </div>
        {selectedIds.size > 0 && (
          <>
            <span className="text-sm text-muted-foreground self-center">{selectedIds.size} محدد</span>
            <Button variant="outline" size="sm" onClick={() => exportSelected()} disabled={reviews.length === 0}>
              <Download className="h-4 w-4 ml-2" />
              تصدير المحدد
            </Button>
            <Button size="sm" onClick={() => bulkSetStatus('APPROVED')} disabled={bulkUpdating}>
              الموافقة على المحدد
            </Button>
            <Button variant="destructive" size="sm" onClick={() => bulkSetStatus('REJECTED')} disabled={bulkUpdating}>
              رفض المحدد
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              إلغاء التحديد
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={exportSelected} disabled={reviews.length === 0}>
          <Download className="h-4 w-4 ml-2" />
          تصدير CSV
        </Button>
        <Button variant="outline" onClick={loadReviews}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {averageRating != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">متوسط التقييم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-8 w-8 fill-amber-400 text-amber-400" />
              <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground">/ 5</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All reviews</CardTitle>
          <CardDescription>Approve, reject, or reply to reviews from the detail page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={reviews.length > 0 && selectedIds.size === reviews.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ) : reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No reviews found</TableCell>
                  </TableRow>
                ) : (
reviews.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(r.id)}
                      onCheckedChange={() => toggleSelectOne(r.id)}
                      aria-label={`Select ${r.id}`}
                    />
                  </TableCell>
                  <TableCell>
                        {r.booking ? (
                          <Link href={`/admin/bookings/${r.bookingId}`} className="text-primary hover:underline">
                            {r.booking.bookingNumber}
                          </Link>
                        ) : r.bookingId}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[140px] truncate">
                        {r.equipmentNames || '—'}
                      </TableCell>
                      <TableCell>
                        {r.user ? (
                          <span>{r.user.name || r.user.email}</span>
                        ) : r.userId}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {r.rating}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.comment || '—'}</TableCell>
                      <TableCell>
                        <Badge className={statusColor[r.status] ?? 'bg-gray-100 text-gray-800'}>{r.status.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(r.createdAt)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/reviews/${r.id}`}>
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
