/**
 * @file page.tsx
 * @description Review detail – moderate status and respond with admin reply
 * @module app/admin/(routes)/reviews/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, MessageSquare, Send, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils/format.utils'
import { Skeleton } from '@/components/ui/skeleton'

interface ReviewDetail {
  id: string
  bookingId: string
  userId: string
  rating: number
  comment: string | null
  status: string
  adminResponse: string | null
  respondedBy: string | null
  respondedAt: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; name: string | null; email: string }
  booking?: {
    id: string
    bookingNumber: string
    status: string
    startDate: string
    endDate: string
    customerId?: string
  }
}

export default function ReviewDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [review, setReview] = useState<ReviewDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [moderateOpen, setModerateOpen] = useState(false)
  const [respondOpen, setRespondOpen] = useState(false)
  const [moderateStatus, setModerateStatus] = useState<string>('APPROVED')
  const [adminResponse, setAdminResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (params?.id) loadReview()
  }, [params?.id])

  const loadReview = async () => {
    const id = params?.id
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reviews/${id}`)
      if (!res.ok) throw new Error('Failed to load review')
      const data = await res.json()
      setReview(data)
      setAdminResponse(data.adminResponse ?? '')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load review',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleModerate = async () => {
    if (!review) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: moderateStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      toast({ title: 'Success', description: 'Review status updated' })
      setModerateOpen(false)
      loadReview()
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRespond = async () => {
    if (!review || !adminResponse.trim()) {
      toast({ title: 'Error', description: 'Response text is required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reviews/${review.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminResponse: adminResponse.trim() }),
      })
      if (!res.ok) throw new Error('Failed to send response')
      toast({ title: 'Success', description: 'Response posted' })
      setRespondOpen(false)
      loadReview()
    } catch {
      toast({ title: 'Error', description: 'Failed to send response', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !review) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const statusColor: Record<string, string> = {
    PENDING_MODERATION: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/reviews">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Review</h1>
          <p className="text-sm text-muted-foreground">
            Booking {review.booking?.bookingNumber ?? review.bookingId} ·{' '}
            {formatDate(review.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              Rating &amp; comment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-semibold">{review.rating} / 5</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {review.comment || 'No comment'}
            </p>
            <div>
              <span className="text-sm text-muted-foreground">Customer: </span>
              <span>{review.user?.name || review.user?.email || review.userId}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Moderation
            </CardTitle>
            <CardDescription>
              Approve or reject the review; optionally add a public reply
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={statusColor[review.status] ?? 'bg-gray-100'}>
                {review.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            {review.adminResponse && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Your response</p>
                <p className="whitespace-pre-wrap rounded bg-muted p-3 text-sm">
                  {review.adminResponse}
                </p>
                {review.respondedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Responded {formatDate(review.respondedAt)}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setModerateStatus(review.status === 'REJECTED' ? 'APPROVED' : 'REJECTED')
                  setModerateOpen(true)
                }}
              >
                {review.status === 'PENDING_MODERATION' ? (
                  <CheckCircle className="me-2 h-4 w-4" />
                ) : (
                  <XCircle className="me-2 h-4 w-4" />
                )}
                {review.status === 'PENDING_MODERATION' ? 'Approve / Reject' : 'Change status'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAdminResponse(review.adminResponse ?? '')
                  setRespondOpen(true)
                }}
              >
                <Send className="me-2 h-4 w-4" />
                {review.adminResponse ? 'Edit response' : 'Respond'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {review.booking && (
        <Card>
          <CardHeader>
            <CardTitle>Booking</CardTitle>
            <CardDescription>Booking linked to this review</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href={`/admin/bookings/${review.booking.id}`}>
                {review.booking.bookingNumber} · {review.booking.status}
              </Link>
            </Button>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(review.booking.startDate)} – {formatDate(review.booking.endDate)}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={moderateOpen} onOpenChange={setModerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>
              Approved reviews are shown publicly; rejected are hidden.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={moderateStatus} onValueChange={setModerateStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="PENDING_MODERATION">Pending moderation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModerateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleModerate} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={respondOpen} onOpenChange={setRespondOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to review</DialogTitle>
            <DialogDescription>
              Your reply will be shown publicly under the review.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              rows={4}
              placeholder="Thank you for your feedback..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRespond} disabled={submitting || !adminResponse.trim()}>
              {submitting ? 'Sending...' : 'Post response'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
