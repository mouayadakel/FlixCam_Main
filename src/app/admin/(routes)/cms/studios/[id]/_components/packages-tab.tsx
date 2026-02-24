/**
 * Packages tab: CRUD for studio packages (max 15), reorder
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { ChevronUp, ChevronDown, Pencil, Trash2, Loader2, Plus, Star } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface StudioPackage {
  id: string
  name: string
  nameAr: string | null
  nameZh: string | null
  description: string | null
  descriptionAr: string | null
  includes: string | null
  price: number | { toNumber: () => number }
  originalPrice: number | { toNumber: () => number } | null
  discountPercent: number | null
  hours: number | null
  order: number
}

const MAX_PACKAGES = 15

function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'toNumber' in v)
    return (v as { toNumber: () => number }).toNumber()
  return 0
}

interface PackagesTabProps {
  studioId: string
  onRefresh: () => void
}

export function CmsStudioPackagesTab({ studioId, onRefresh }: PackagesTabProps) {
  const { toast } = useToast()
  const [packages, setPackages] = useState<StudioPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    nameAr: '',
    nameZh: '',
    description: '',
    descriptionAr: '',
    includes: '',
    price: '',
    originalPrice: '',
    discountPercent: '',
    hours: '',
    recommended: false,
    badgeText: '',
    isActive: true,
  })

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/packages`)
      if (res.ok) {
        const json = await res.json()
        setPackages(json.data ?? [])
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحميل', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [studioId, toast])

  useEffect(() => {
    load()
  }, [load])

  const resetForm = () => {
    setForm({
      name: '',
      nameAr: '',
      nameZh: '',
      description: '',
      descriptionAr: '',
      includes: '',
      price: '',
      originalPrice: '',
      discountPercent: '',
      hours: '',
      recommended: false,
      badgeText: '',
      isActive: true,
    })
    setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (pkg: StudioPackage) => {
    setForm({
      name: pkg.name,
      nameAr: pkg.nameAr ?? '',
      nameZh: (pkg as any).nameZh ?? '',
      description: pkg.description ?? '',
      descriptionAr: (pkg as any).descriptionAr ?? '',
      includes: pkg.includes ?? '',
      price: String(toNum(pkg.price)),
      originalPrice: pkg.originalPrice != null ? String(toNum(pkg.originalPrice)) : '',
      discountPercent: pkg.discountPercent != null ? String(pkg.discountPercent) : '',
      hours: pkg.hours != null ? String(pkg.hours) : '',
      recommended: (pkg as any).recommended ?? false,
      badgeText: (pkg as any).badgeText ?? '',
      isActive: (pkg as any).isActive ?? true,
    })
    setEditingId(pkg.id)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      nameAr: form.nameAr.trim() || undefined,
      nameZh: form.nameZh.trim() || undefined,
      description: form.description.trim() || undefined,
      descriptionAr: form.descriptionAr.trim() || undefined,
      includes: form.includes.trim() || undefined,
      price: parseFloat(form.price) || 0,
      originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
      discountPercent: form.discountPercent ? parseInt(form.discountPercent, 10) : undefined,
      hours: form.hours ? parseInt(form.hours, 10) : undefined,
      recommended: form.recommended,
      badgeText: form.badgeText.trim() || undefined,
      isActive: form.isActive,
    }
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/studios/${studioId}/packages/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed')
        }
        toast({ title: 'تم', description: 'تم تحديث الباكج' })
      } else {
        const res = await fetch(`/api/admin/studios/${studioId}/packages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed')
        }
        toast({ title: 'تم', description: 'تم إضافة الباكج' })
      }
      setDialogOpen(false)
      resetForm()
      load()
      onRefresh()
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل الحفظ',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (pkgId: string) => {
    if (!confirm('حذف هذا الباكج؟')) return
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/packages/${pkgId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      setPackages((prev) => prev.filter((p) => p.id !== pkgId))
      toast({ title: 'تم', description: 'تم حذف الباكج' })
      onRefresh()
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' })
    }
  }

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= packages.length) return
    const reordered = [...packages]
    ;[reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]]
    const packageIds = reordered.map((p) => p.id)
    setReordering(true)
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/packages/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageIds }),
      })
      if (!res.ok) throw new Error('Reorder failed')
      setPackages(reordered)
      toast({ title: 'تم', description: 'تم تغيير الترتيب' })
      onRefresh()
    } catch {
      toast({ title: 'خطأ', description: 'فشل تغيير الترتيب', variant: 'destructive' })
    } finally {
      setReordering(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>الباكجات</CardTitle>
          <CardDescription>حد أقصى {MAX_PACKAGES} باكج لكل استوديو</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} disabled={packages.length >= MAX_PACKAGES}>
              <Plus className="h-4 w-4" />
              <span className="mr-2">إضافة</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل الباكج' : 'إضافة باكج'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pkg-name">الاسم (EN) *</Label>
                <Input
                  id="pkg-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-nameAr">الاسم (عربي)</Label>
                <Input
                  id="pkg-nameAr"
                  value={form.nameAr}
                  onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-nameZh">الاسم (صيني)</Label>
                <Input
                  id="pkg-nameZh"
                  value={form.nameZh}
                  onChange={(e) => setForm((f) => ({ ...f, nameZh: e.target.value }))}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-descriptionAr">الوصف (عربي)</Label>
                <Textarea
                  id="pkg-descriptionAr"
                  value={form.descriptionAr}
                  onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))}
                  rows={2}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-price">السعر (ر.س) *</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-originalPrice">السعر الأصلي (ر.س)</Label>
                <Input
                  id="pkg-originalPrice"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.originalPrice}
                  onChange={(e) => setForm((f) => ({ ...f, originalPrice: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-hours">عدد الساعات</Label>
                <Input
                  id="pkg-hours"
                  type="number"
                  min={0}
                  value={form.hours}
                  onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-discountPercent">نسبة الخصم (%)</Label>
                <Input
                  id="pkg-discountPercent"
                  type="number"
                  min={0}
                  max={100}
                  value={form.discountPercent}
                  onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-includes">يشمل</Label>
                <Textarea
                  id="pkg-includes"
                  value={form.includes}
                  onChange={(e) => setForm((f) => ({ ...f, includes: e.target.value }))}
                  rows={2}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pkg-badgeText">نص الشارة (اختياري)</Label>
                <Input
                  id="pkg-badgeText"
                  value={form.badgeText}
                  onChange={(e) => setForm((f) => ({ ...f, badgeText: e.target.value }))}
                  placeholder="مثال: الأكثر طلباً"
                  dir="rtl"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <Label htmlFor="pkg-recommended">موصى به (الأكثر طلباً)</Label>
                </div>
                <Switch
                  id="pkg-recommended"
                  checked={form.recommended}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, recommended: v }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <Label htmlFor="pkg-isActive">نشط</Label>
                <Switch
                  id="pkg-isActive"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit">حفظ</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {packages.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد باكجات</p>
          ) : (
            packages.map((pkg, i) => (
              <div key={pkg.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === 0 || reordering}
                      onClick={() => moveItem(i, 'up')}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={i === packages.length - 1 || reordering}
                      onClick={() => moveItem(i, 'down')}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{pkg.nameAr || pkg.name}</p>
                      {(pkg as any).recommended && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          <Star className="h-3 w-3" />
                          {(pkg as any).badgeText || 'موصى به'}
                        </span>
                      )}
                      {!(pkg as any).isActive && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">
                          غير نشط
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {toNum(pkg.price)} ر.س
                      {pkg.hours != null ? ` · ${pkg.hours} ساعة` : ''}
                      {pkg.discountPercent ? ` · خصم ${pkg.discountPercent}%` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(pkg)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(pkg.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
