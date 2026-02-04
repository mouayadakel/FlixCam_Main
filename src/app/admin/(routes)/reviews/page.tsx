/**
 * @file page.tsx
 * @description Reviews list with status filter and link to detail
 * @module app/admin/(routes)/reviews
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Star, Eye, RefreshCw, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  adminResponse: string | null
  respondedAt: string | null
  createdAt: string
  user?: { id: string; name: string | null; email: string }
  booking?: { id: string; bookingNumber: string; status: string; startDate: string; endDate: string }
}

export default function ReviewsPage() {
  const { toast } = useToast()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

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
        <Button variant="outline" onClick={loadReviews}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

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
                  <TableHead>Booking</TableHead>
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
                    <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ) : reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No reviews found</TableCell>
                  </TableRow>
                ) : (
                  reviews.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {r.booking ? (
                          <Link href={`/admin/bookings/${r.bookingId}`} className="text-primary hover:underline">
                            {r.booking.bookingNumber}
                          </Link>
                        ) : r.bookingId}
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
