/**
 * Slide-over editor for shoot type (basic fields). Full editor at /admin/shoot-types/[id].
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface ShootTypeEditorSheetProps {
  shootTypeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function ShootTypeEditorSheet({
  shootTypeId,
  open,
  onOpenChange,
  onSaved,
}: ShootTypeEditorSheetProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    isActive: true,
  })

  useEffect(() => {
    if (!open || !shootTypeId) return
    setLoading(true)
    fetch(`/api/admin/shoot-types/${shootTypeId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then((data) => {
        setForm({
          name: data.name ?? '',
          slug: data.slug ?? '',
          description: data.description ?? '',
          isActive: data.isActive ?? true,
        })
      })
      .catch(() =>
        toast({ title: 'Error', description: 'Failed to load shoot type', variant: 'destructive' })
      )
      .finally(() => setLoading(false))
  }, [open, shootTypeId, toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/shoot-types/${shootTypeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save')
      }
      toast({ title: 'Saved', description: 'Shoot type updated.' })
      onSaved()
      onOpenChange(false)
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to save',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Shoot Type</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
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
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
            <Button variant="outline" className="w-full gap-2" asChild>
              <Link href={`/admin/shoot-types/${shootTypeId}`}>
                <ExternalLink className="h-4 w-4" />
                Full editor (categories, recommendations, questionnaire)
              </Link>
            </Button>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
