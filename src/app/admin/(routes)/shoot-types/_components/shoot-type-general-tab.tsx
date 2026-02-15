/**
 * General tab: name, slug, description, i18n, icon, coverImageUrl, sortOrder, isActive.
 */

'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

interface ShootTypeFullConfig {
  id: string
  name: string
  slug: string
  description: string | null
  nameAr: string | null
  nameZh: string | null
  descriptionAr: string | null
  descriptionZh: string | null
  icon: string | null
  coverImageUrl: string | null
  sortOrder: number
  isActive: boolean
}

export function ShootTypeGeneralTab({
  shootType,
  onSaved,
}: {
  shootType: ShootTypeFullConfig
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: shootType.name,
    slug: shootType.slug,
    description: shootType.description ?? '',
    nameAr: shootType.nameAr ?? '',
    nameZh: shootType.nameZh ?? '',
    descriptionAr: shootType.descriptionAr ?? '',
    descriptionZh: shootType.descriptionZh ?? '',
    icon: shootType.icon ?? '',
    coverImageUrl: shootType.coverImageUrl ?? '',
    sortOrder: shootType.sortOrder,
    isActive: shootType.isActive,
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/shoot-types/${shootType.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          nameAr: form.nameAr || null,
          nameZh: form.nameZh || null,
          descriptionAr: form.descriptionAr || null,
          descriptionZh: form.descriptionZh || null,
          icon: form.icon || null,
          coverImageUrl: form.coverImageUrl || null,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save')
      }
      toast({ title: 'Saved' })
      onSaved()
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to save', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Name, slug, descriptions, icon, cover image, and active status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Name (EN)</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description (EN)</Label>
          <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Name (AR)</Label>
            <Input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Name (ZH)</Label>
            <Input value={form.nameZh} onChange={(e) => setForm((f) => ({ ...f, nameZh: e.target.value }))} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Description (AR)</Label>
            <Textarea value={form.descriptionAr} onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Description (ZH)</Label>
            <Textarea value={form.descriptionZh} onChange={(e) => setForm((f) => ({ ...f, descriptionZh: e.target.value }))} rows={2} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Icon (Lucide name)</Label>
            <Input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="e.g. Camera" />
          </div>
          <div className="space-y-2">
            <Label>Cover image URL</Label>
            <Input value={form.coverImageUrl} onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))} placeholder="https://..." />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Label>Sort order</Label>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label>Active</Label>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
      </CardContent>
    </Card>
  )
}
