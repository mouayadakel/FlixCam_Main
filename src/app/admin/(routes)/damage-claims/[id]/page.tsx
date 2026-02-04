/**
 * @file page.tsx
 * @description Damage claim detail with resolve workflow
 * @module app/admin/(routes)/damage-claims/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { Skeleton } from '@/components/ui/skeleton'

interface Claim {
  id: string
  bookingId: string
  equipmentId: string | null
  studioId: string | null
  damageType: string
  severity: string
  description: string
  photos: string[] | null
  estimatedCost: string
  actualCost: string | null
  status: string
  resolution: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  customerNotified: boolean
  insuranceClaim: boolean
  createdAt: string
  updatedAt: string
  booking?: { id: string; bookingNumber: string; status: string }
  equipment?: { id: string; sku: string; model: string | null } | null
  studio?: { id: string; name: string; slug: string } | null
  reporter?: { id: string; name: string | null; email: string }
  resolver?: { id: string; name: string | null } | null
}

export default function DamageClaimDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [claim, setClaim] = useState<Claim | null>(null)
  const [loading, setLoading] = useState(true)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveStatus, setResolveStatus] = useState<'APPROVED' | 'REJECTED' | 'RESOLVED'>('RESOLVED')
  const [resolveResolution, setResolveResolution] = useState('')
  const [actualCost, setActualCost] = useState('')
  const [customerNotified, setCustomerNotified] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (params.id) loadClaim()
  }, [params.id])

  const loadClaim = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/damage-claims/${params.id}`)
      if (!res.ok) throw new Error('Failed to load claim')
      const data = await res.json()
      setClaim(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load claim',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async () => {
    if (!claim || !resolveResolution.trim()) {
      toast({ title: 'Error', description: 'Resolution notes are required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/damage-claims/${claim.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: resolveStatus,
          resolution: resolveResolution.trim(),
          actualCost: actualCost ? Number(actualCost) : null,
          customerNotified,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to resolve')
      toast({ title: 'Success', description: 'Claim resolved' })
      setResolveOpen(false)
      setResolveResolution('')
      setActualCost('')
      loadClaim()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resolve',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !claim) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const canResolve = ['PENDING', 'INVESTIGATING', 'DISPUTED'].includes(claim.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/damage-claims">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <AlertTriangle className="h-8 w-8" />
            Damage Claim
          </h1>
          <p className="text-muted-foreground mt-1">
            {claim.booking?.bookingNumber && (
              <>
                Booking{' '}
                <Link href={`/admin/bookings/${claim.bookingId}`} className="text-primary hover:underline">
                  #{claim.booking.bookingNumber}
                </Link>
              </>
            )}
          </p>
        </div>
        {canResolve && (
          <Button onClick={() => setResolveOpen(true)}>
            Resolve Claim
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Type, severity, description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Type</Label>
              <p className="font-medium">{claim.damageType.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Severity</Label>
              <p><Badge>{claim.severity}</Badge></p>
            </div>
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="whitespace-pre-wrap">{claim.description}</p>
            </div>
            {claim.photos && Array.isArray(claim.photos) && claim.photos.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Photos</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {claim.photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      Photo {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost &amp; Status</CardTitle>
            <CardDescription>Estimated, actual, resolution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Estimated cost</Label>
              <p className="font-medium">{formatCurrency(Number(claim.estimatedCost))}</p>
            </div>
            {claim.actualCost != null && (
              <div>
                <Label className="text-muted-foreground">Actual cost</Label>
                <p className="font-medium">{formatCurrency(Number(claim.actualCost))}</p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <p><Badge>{claim.status}</Badge></p>
            </div>
            {claim.resolution && (
              <div>
                <Label className="text-muted-foreground">Resolution</Label>
                <p className="whitespace-pre-wrap">{claim.resolution}</p>
                {claim.resolvedAt && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Resolved {formatDate(claim.resolvedAt)} {claim.resolver?.name && `by ${claim.resolver.name}`}
                  </p>
                )}
              </div>
            )}
            {claim.insuranceClaim && (
              <p className="text-sm text-amber-600">Insurance claim</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resource &amp; Reporter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          {claim.equipment && (
            <div>
              <Label className="text-muted-foreground">Equipment</Label>
              <p>
                <Link href={`/admin/inventory/equipment/${claim.equipment.id}`} className="text-primary hover:underline">
                  {claim.equipment.sku} {claim.equipment.model ?? ''}
                </Link>
              </p>
            </div>
          )}
          {claim.studio && (
            <div>
              <Label className="text-muted-foreground">Studio</Label>
              <p>
                <Link href={`/admin/studios/${claim.studio.id}`} className="text-primary hover:underline">
                  {claim.studio.name}
                </Link>
              </p>
            </div>
          )}
          {claim.reporter && (
            <div>
              <Label className="text-muted-foreground">Reported by</Label>
              <p>{claim.reporter.name ?? claim.reporter.email}</p>
              <p className="text-sm text-muted-foreground">{formatDate(claim.createdAt)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve claim</DialogTitle>
            <DialogDescription>Set resolution status and notes. Actual cost is optional.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={resolveStatus} onValueChange={(v) => setResolveStatus(v as 'APPROVED' | 'REJECTED' | 'RESOLVED')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resolution notes *</Label>
              <Textarea
                value={resolveResolution}
                onChange={(e) => setResolveResolution(e.target.value)}
                placeholder="Describe the resolution..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Actual cost (optional)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="customerNotified"
                checked={customerNotified}
                onChange={(e) => setCustomerNotified(e.target.checked)}
              />
              <Label htmlFor="customerNotified">Customer notified</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>Cancel</Button>
            <Button onClick={handleResolve} disabled={submitting || !resolveResolution.trim()}>
              {submitting ? 'Saving...' : 'Resolve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
