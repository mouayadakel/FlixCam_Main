/**
 * @file page.tsx
 * @description New studio form
 * @module app/admin/(routes)/studios/new
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function NewStudioPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
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
      const res = await fetch('/api/studios', {
        method: 'POST',
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
        throw new Error(data.error || 'Failed to create studio')
      }
      const json = await res.json()
      toast({ title: 'Studio created' })
      router.push(`/admin/studios/${json.data?.id ?? ''}`)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create studio',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/studios">
          <ArrowLeft className="me-2 h-4 w-4" />
          Back to Studios
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>New Studio</CardTitle>
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
                placeholder="e.g. Studio A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Optional description"
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
                  placeholder="Optional"
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
                  placeholder="0.00"
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
                {submitting ? 'Creating…' : 'Create Studio'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/studios">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
