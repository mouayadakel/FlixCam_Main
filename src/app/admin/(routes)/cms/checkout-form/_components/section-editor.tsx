'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'

export interface SectionFormData {
  nameEn: string
  nameAr: string
  step: number
  sortOrder: number
  isActive: boolean
}

interface SectionEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: SectionFormData | null
  sectionId?: string | null
  onSaved: () => void
}

export function SectionEditor({
  open,
  onOpenChange,
  initialData,
  sectionId,
  onSaved,
}: SectionEditorProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<SectionFormData>({
    nameEn: '',
    nameAr: '',
    step: 1,
    sortOrder: 0,
    isActive: true,
  })

  useEffect(() => {
    if (initialData) {
      setForm(initialData)
    } else {
      setForm({
        nameEn: '',
        nameAr: '',
        step: 1,
        sortOrder: 0,
        isActive: true,
      })
    }
  }, [initialData, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (sectionId) {
        const res = await fetch('/api/admin/cms/checkout-form', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'section', id: sectionId, ...form }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Update failed')
        }
      } else {
        const res = await fetch('/api/admin/cms/checkout-form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'section', ...form }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Create failed')
        }
      }
      onSaved()
      onOpenChange(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{sectionId ? 'Edit Section' : 'Add Section'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Name (EN)</Label>
            <Input
              value={form.nameEn}
              onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
              placeholder="Section name"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Name (AR)</Label>
            <Input
              value={form.nameAr}
              onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
              placeholder="اسم القسم"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Step (1, 2, or 3)</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.step}
              onChange={(e) => setForm((p) => ({ ...p, step: parseInt(e.target.value, 10) }))}
            >
              <option value={1}>Step 1 – Receiver & Fulfillment</option>
              <option value={2}>Step 2 – Add-ons</option>
              <option value={3}>Step 3 – Review & Pay</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Sort order</Label>
            <Input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) =>
                setForm((p) => ({ ...p, sortOrder: parseInt(e.target.value, 10) || 0 }))
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
            />
            <Label>Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
