/**
 * Testimonials tab: CRUD for studio testimonials
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Pencil, Trash2, Loader2, Plus, Star } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Testimonial {
  id: string
  name: string
  role: string | null
  text: string
  rating: number
  avatarUrl: string | null
  order: number
  isActive: boolean
}

interface TestimonialsTabProps {
  studioId: string
}

export function CmsStudioTestimonialsTab({ studioId }: TestimonialsTabProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    role: '',
    text: '',
    rating: 5,
    avatarUrl: '',
    isActive: true,
  })

  const load = async () => {
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/testimonials`)
      if (res.ok) {
        const json = await res.json()
        setItems(json.data ?? [])
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [studioId])

  const resetForm = () => {
    setForm({ name: '', role: '', text: '', rating: 5, avatarUrl: '', isActive: true })
    setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (item: Testimonial) => {
    setForm({
      name: item.name,
      role: item.role ?? '',
      text: item.text,
      rating: item.rating,
      avatarUrl: item.avatarUrl ?? '',
      isActive: item.isActive,
    })
    setEditingId(item.id)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      role: form.role.trim() || undefined,
      text: form.text.trim(),
      rating: form.rating,
      avatarUrl: form.avatarUrl.trim() || undefined,
      isActive: form.isActive,
    }
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/studios/${studioId}/testimonials/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'فشل التحديث')
        }
      } else {
        const res = await fetch(`/api/admin/studios/${studioId}/testimonials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'فشل الإنشاء')
        }
      }
      toast({
        title: 'تم الحفظ',
        description: editingId ? 'تم تحديث التقييم' : 'تمت إضافة التقييم',
      })
      setDialogOpen(false)
      resetForm()
      load()
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'حدث خطأ',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا التقييم؟')) return
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/testimonials/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('فشل الحذف')
      toast({ title: 'تم الحذف' })
      load()
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>التقييمات</CardTitle>
          <CardDescription>آراء العملاء وتقييماتهم</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="me-1 h-4 w-4" /> إضافة تقييم
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل التقييم' : 'إضافة تقييم'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="t-name">الاسم *</Label>
                <Input
                  id="t-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-role">الصفة / الدور</Label>
                <Input
                  id="t-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="مثال: مصور فوتوغرافي"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-text">نص التقييم *</Label>
                <Textarea
                  id="t-text"
                  required
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                  rows={3}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-rating">التقييم (1-5)</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, rating: v }))}
                      className="p-0.5"
                    >
                      <Star
                        className={`h-5 w-5 transition-colors ${
                          v <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-avatar">رابط الصورة (اختياري)</Label>
                <Input
                  id="t-avatar"
                  type="url"
                  value={form.avatarUrl}
                  onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border p-3">
                <Label htmlFor="t-active">نشط</Label>
                <Switch
                  id="t-active"
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
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">لا توجد تقييمات بعد</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    {item.role && (
                      <span className="text-xs text-muted-foreground">· {item.role}</span>
                    )}
                    {!item.isActive && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">
                        غير نشط
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <Star
                        key={v}
                        className={`h-3 w-3 ${v <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.text}</p>
                </div>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
