/**
 * Add-ons tab: CRUD for studio add-ons with category, icon, originalPrice, search
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Pencil, Trash2, Loader2, Plus, Search, GripVertical } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const ADDON_CATEGORIES = [
  { value: 'equipment', label: 'معدات' },
  { value: 'lighting', label: 'إضاءة' },
  { value: 'props', label: 'ديكور' },
  { value: 'crew', label: 'طاقم' },
  { value: 'catering', label: 'ضيافة' },
  { value: 'other', label: 'أخرى' },
]

interface AddOn {
  id: string
  name: string
  description: string | null
  price: number
  originalPrice: number | null
  category: string | null
  iconName: string | null
  sortOrder: number
  isActive: boolean
}

interface AddonsTabProps {
  studioId: string
  onRefresh: () => void
}

const defaultForm = {
  name: '',
  description: '',
  price: '',
  originalPrice: '',
  category: '',
  iconName: '',
  sortOrder: '0',
  isActive: true,
}

export function CmsStudioAddonsTab({ studioId, onRefresh }: AddonsTabProps) {
  const { toast } = useToast()
  const [addOns, setAddOns] = useState<AddOn[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('all')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/addons`)
      if (res.ok) {
        const json = await res.json()
        setAddOns(json.data ?? [])
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

  const filtered = useMemo(() => {
    let list = addOns
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
      )
    }
    if (catFilter !== 'all') {
      list = list.filter((a) => a.category === catFilter)
    }
    return list.sort((a, b) => a.sortOrder - b.sortOrder)
  }, [addOns, search, catFilter])

  const openCreate = () => {
    setForm(defaultForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = (a: AddOn) => {
    setForm({
      name: a.name,
      description: a.description ?? '',
      price: String(a.price),
      originalPrice: a.originalPrice != null ? String(a.originalPrice) : '',
      category: a.category ?? '',
      iconName: a.iconName ?? '',
      sortOrder: String(a.sortOrder ?? 0),
      isActive: a.isActive,
    })
    setEditingId(a.id)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price) || 0,
      originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
      category: form.category || null,
      iconName: form.iconName.trim() || null,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
      isActive: form.isActive,
    }
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/studios/${studioId}/addons/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed')
        }
        toast({ title: 'تم', description: 'تم تحديث الإضافة' })
      } else {
        const res = await fetch(`/api/admin/studios/${studioId}/addons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed')
        }
        toast({ title: 'تم', description: 'تم إضافة الإضافة' })
      }
      setDialogOpen(false)
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

  const handleDelete = async (addonId: string) => {
    if (!confirm('حذف هذه الإضافة؟')) return
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/addons/${addonId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      setAddOns((prev) => prev.filter((a) => a.id !== addonId))
      toast({ title: 'تم', description: 'تم حذف الإضافة' })
      onRefresh()
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' })
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
          <CardTitle>الإضافات</CardTitle>
          <CardDescription>إضافات اختيارية عند الحجز — {addOns.length} إضافة</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              <span className="mr-2">إضافة جديدة</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل الإضافة' : 'إضافة جديدة'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addon-name">الاسم *</Label>
                <Input
                  id="addon-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  dir="rtl"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="addon-price">السعر (ر.س) *</Label>
                  <Input
                    id="addon-price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addon-original-price">السعر الأصلي (اختياري)</Label>
                  <Input
                    id="addon-original-price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.originalPrice}
                    onChange={(e) => setForm((f) => ({ ...f, originalPrice: e.target.value }))}
                    placeholder="للعرض كسعر مشطوب"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>التصنيف</Label>
                  <Select
                    value={form.category || 'none'}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, category: v === 'none' ? '' : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر تصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— بدون تصنيف</SelectItem>
                      {ADDON_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addon-sort">الترتيب</Label>
                  <Input
                    id="addon-sort"
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addon-icon">اسم الأيقونة (Lucide)</Label>
                <Input
                  id="addon-icon"
                  value={form.iconName}
                  onChange={(e) => setForm((f) => ({ ...f, iconName: e.target.value }))}
                  placeholder="مثال: Camera, Lightbulb, Mic"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  اسم الأيقونة من مكتبة Lucide —{' '}
                  <a
                    href="https://lucide.dev/icons"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    عرض الأيقونات
                  </a>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addon-desc">الوصف</Label>
                <Textarea
                  id="addon-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  dir="rtl"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="addon-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                <Label htmlFor="addon-active">نشط</Label>
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
      <CardContent className="space-y-4">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث في الإضافات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
              dir="rtl"
            />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="التصنيف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {ADDON_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {addOns.length === 0 ? 'لا توجد إضافات بعد' : 'لا توجد نتائج للبحث'}
            </div>
          ) : (
            filtered.map((a) => {
              const catLabel = ADDON_CATEGORIES.find((c) => c.value === a.category)?.label
              const hasSale = a.originalPrice != null && a.originalPrice > a.price
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/30 ${!a.isActive ? 'opacity-50' : ''}`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{a.name}</p>
                      {catLabel && (
                        <Badge variant="outline" className="text-[10px]">
                          {catLabel}
                        </Badge>
                      )}
                      {!a.isActive && (
                        <Badge variant="secondary" className="text-[10px]">
                          معطّل
                        </Badge>
                      )}
                      {hasSale && (
                        <Badge className="bg-success-50 text-[10px] text-success-700">عرض</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {hasSale && <span className="line-through">{a.originalPrice} ر.س</span>}
                      <span className={hasSale ? 'font-semibold text-primary' : ''}>
                        {a.price} ر.س
                      </span>
                      {a.description && <span className="truncate">— {a.description}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
