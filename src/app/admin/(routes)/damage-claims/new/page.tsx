/**
 * @file page.tsx
 * @description Report new damage claim (from booking or standalone)
 * @module app/admin/(routes)/damage-claims/new
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

const DAMAGE_TYPES = [
  'PHYSICAL_DAMAGE',
  'MALFUNCTION',
  'MISSING_PARTS',
  'EXCESSIVE_WEAR',
  'LOSS',
  'OTHER',
] as const

const SEVERITIES = ['MINOR', 'MODERATE', 'SEVERE', 'TOTAL_LOSS'] as const

function NewDamageClaimForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingIdParam = searchParams.get('bookingId')
  const { toast } = useToast()
  const [booking, setBooking] = useState<{ id: string; bookingNumber: string; equipment?: Array<{ id: string; quantity: number; equipment: { id: string; sku: string; model: string | null } }>; studioId?: string | null; studio?: { id: string; name: string } | null } | null>(null)
  const [loadingBooking, setLoadingBooking] = useState(!!bookingIdParam)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    bookingId: bookingIdParam ?? '',
    equipmentId: '',
    studioId: '',
    damageType: 'PHYSICAL_DAMAGE' as (typeof DAMAGE_TYPES)[number],
    severity: 'MODERATE' as (typeof SEVERITIES)[number],
    description: '',
    estimatedCost: '',
    insuranceClaim: false,
  })

  useEffect(() => {
    if (!bookingIdParam) return
    setForm((f) => ({ ...f, bookingId: bookingIdParam }))
    fetch(`/api/bookings/${bookingIdParam}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setBooking(data)
        setForm((f) => ({ ...f, bookingId: bookingIdParam }))
      })
      .catch(() => setBooking(null))
      .finally(() => setLoadingBooking(false))
  }, [bookingIdParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.bookingId.trim()) {
      toast({ title: 'Error', description: 'Booking is required', variant: 'destructive' })
      return
    }
    if (!form.description.trim()) {
      toast({ title: 'Error', description: 'Description is required', variant: 'destructive' })
      return
    }
    const cost = parseFloat(form.estimatedCost)
    if (isNaN(cost) || cost < 0) {
      toast({ title: 'Error', description: 'Valid estimated cost is required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/damage-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: form.bookingId,
          equipmentId: form.equipmentId || null,
          studioId: form.studioId || null,
          damageType: form.damageType,
          severity: form.severity,
          description: form.description.trim(),
          estimatedCost: cost,
          insuranceClaim: form.insuranceClaim,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create claim')
      toast({ title: 'Success', description: 'Damage claim created' })
      router.push(`/admin/damage-claims/${data.claim?.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create claim',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (bookingIdParam && loadingBooking) {
    return <div className="text-muted-foreground">Loading booking...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={bookingIdParam ? `/admin/bookings/${bookingIdParam}` : '/admin/damage-claims'}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <AlertTriangle className="h-8 w-8" />
            Report Damage
          </h1>
          <p className="text-muted-foreground mt-1">
            {bookingIdParam && booking
              ? `Booking #${booking.bookingNumber}`
              : 'Create a new damage claim for a booking'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claim details</CardTitle>
          <CardDescription>Describe the damage and estimated cost</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!bookingIdParam && (
              <div className="space-y-2">
                <Label>Booking ID *</Label>
                <Input
                  value={form.bookingId}
                  onChange={(e) => setForm({ ...form, bookingId: e.target.value })}
                  placeholder="Booking CUID"
                  required
                />
              </div>
            )}

            {booking?.equipment && booking.equipment.length > 0 && (
              <div className="space-y-2">
                <Label>Equipment (optional)</Label>
                <Select value={form.equipmentId} onValueChange={(v) => setForm({ ...form, equipmentId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {booking.equipment.map((be: { id: string; equipment: { id: string; sku: string; model: string | null } }) => (
                      <SelectItem key={be.equipment.id} value={be.equipment.id}>
                        {be.equipment.sku} {be.equipment.model ?? ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {booking?.studio && (
              <div className="space-y-2">
                <Label>Studio (optional)</Label>
                <Select value={form.studioId} onValueChange={(v) => setForm({ ...form, studioId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select studio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    <SelectItem value={booking.studio.id}>{booking.studio.name}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Damage type *</Label>
                <Select value={form.damageType} onValueChange={(v) => setForm({ ...form, damageType: v as (typeof DAMAGE_TYPES)[number] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAMAGE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity *</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as (typeof SEVERITIES)[number] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the damage..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Estimated cost (SAR) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.estimatedCost}
                onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="insuranceClaim"
                checked={form.insuranceClaim}
                onChange={(e) => setForm({ ...form, insuranceClaim: e.target.checked })}
              />
              <Label htmlFor="insuranceClaim">Insurance claim</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create claim'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={form.bookingId ? `/admin/bookings/${form.bookingId}` : '/admin/damage-claims'}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewDamageClaimPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewDamageClaimForm />
    </Suspense>
  )
}
