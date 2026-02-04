/**
 * @file page.tsx
 * @description Edit studio form
 * @module app/admin/(routes)/studios/[id]/edit
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function EditStudioPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '',
    description: '',
    capacity: '',
    hourlyRate: '',
    setupBuffer: '30',
    cleaningBuffer: '30',
    resetTime: '15',
    isActive: true,
  })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetch(`/api/studios/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.data) return
        const s = json.data
        setForm({
          name: s.name ?? '',
          description: s.description ?? '',
          capacity: s.capacity != null ? String(s.capacity) : '',
          hourlyRate: s.hourlyRate != null ? String(s.hourlyRate) : '',
          setupBuffer: String(s.setupBuffer ?? 30),
          cleaningBuffer: String(s.cleaningBuffer ?? 30),
          resetTime: String(s.resetTime ?? 15),
          isActive: s.isActive ?? true,
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const capacityNum = form.capacity === '' ? undefined : parseInt(form.capacity, 10)
    const hourlyRate = parseFloat(form.hourlyRate)
    if (Number.isNaN(hourlyRate) || hourlyRate < 0) {
      toast({ title: 'Invalid hourly rate', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/studios/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          capacity: capacityNum ?? null,
          hourlyRate,
          setupBuffer: parseInt(form.setupBuffer, 10) || 30,
          cleaningBuffer: parseInt(form.cleaningBuffer, 10) || 30,
          resetTime: parseInt(form.resetTime, 10) || 15,
          isActive: form.isActive,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update studio')
      }
      toast({ title: 'Studio updated' })
      router.push(`/admin/studios/${id}`)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update studio',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/studios/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12">Loading…</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/studios/${id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Studio
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Edit Studio</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (people)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={0}
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly rate *</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.hourlyRate}
                  onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="setupBuffer">Setup buffer (min)</Label>
                <Input
                  id="setupBuffer"
                  type="number"
                  min={0}
                  value={form.setupBuffer}
                  onChange={(e) => setForm((f) => ({ ...f, setupBuffer: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cleaningBuffer">Cleaning buffer (min)</Label>
                <Input
                  id="cleaningBuffer"
                  type="number"
                  min={0}
                  value={form.cleaningBuffer}
                  onChange={(e) => setForm((f) => ({ ...f, cleaningBuffer: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resetTime">Reset time (min)</Label>
                <Input
                  id="resetTime"
                  type="number"
                  min={0}
                  value={form.resetTime}
                  onChange={(e) => setForm((f) => ({ ...f, resetTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/admin/studios/${id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
