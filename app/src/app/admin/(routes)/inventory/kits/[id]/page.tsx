/**
 * @file page.tsx
 * @description Kit detail – view and edit
 * @module app/admin/(routes)/inventory/kits/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'

interface KitItem {
  equipmentId: string
  quantity: number
  equipment: { id: string; sku: string; model: string | null; dailyPrice: string }
}

interface KitDetail {
  id: string
  name: string
  slug: string
  description: string | null
  discountPercent: string | null
  isActive: boolean
  items: KitItem[]
  totalDailyRate: number
  finalDailyRate: number
  createdAt: string
  updatedAt: string
}

export default function KitDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [kit, setKit] = useState<KitDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    discountPercent: 0,
    isActive: true,
  })

  const id = params?.id as string

  useEffect(() => {
    if (id) loadKit()
  }, [id])

  const loadKit = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/kits/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          toast({ title: 'غير موجود', description: 'الحزمة غير موجودة', variant: 'destructive' })
          router.push('/admin/inventory/kits')
          return
        }
        throw new Error('فشل التحميل')
      }
      const data = await res.json()
      setKit(data)
      setForm({
        name: data.name ?? '',
        slug: data.slug ?? '',
        description: data.description ?? '',
        discountPercent: parseFloat(data.discountPercent ?? '0') || 0,
        isActive: data.isActive ?? true,
      })
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل الحزمة',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/kits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || null,
          discountPercent: form.discountPercent || null,
          isActive: form.isActive,
        }),
      })
      if (!res.ok) throw new Error('فشل التحديث')
      const data = await res.json()
      setKit(data)
      setEditing(false)
      toast({ title: 'تم', description: 'تم تحديث الحزمة' })
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل التحديث',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/kits/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('فشل الحذف')
      toast({ title: 'تم', description: 'تم حذف الحزمة (حذف تدريجي)' })
      router.push('/admin/inventory/kits')
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل الحذف',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !kit) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/inventory/kits" className="hover:text-foreground">
          الحزم
        </Link>
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        <span>{kit.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{kit.name}</h1>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(false)
                  setForm({
                    name: kit.name,
                    slug: kit.slug,
                    description: kit.description ?? '',
                    discountPercent: parseFloat(kit.discountPercent ?? '0') || 0,
                    isActive: kit.isActive,
                  })
                }}
              >
                إلغاء
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="ms-1 h-4 w-4" />
              تعديل
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="ms-1 h-4 w-4" />
                حذف
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>حذف الحزمة؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف الحزمة تدريجياً. لا يمكن التراجع.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground"
                >
                  حذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الحزمة</CardTitle>
          <CardDescription>الاسم، الرابط، الخصم، والحالة</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>الاسم</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الرابط (slug)</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>خصم %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.discountPercent}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discountPercent: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-24"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>نشط</Label>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">الاسم</Label>
                <p className="font-medium">{kit.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">الرابط</Label>
                <p className="font-mono text-sm">{kit.slug}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">الخصم</Label>
                <p>{kit.discountPercent ? `${kit.discountPercent}%` : '—'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">الحالة</Label>
                <Badge variant={kit.isActive ? 'default' : 'secondary'}>
                  {kit.isActive ? 'نشط' : 'غير نشط'}
                </Badge>
              </div>
              {kit.description && (
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground">الوصف</Label>
                  <p className="text-sm">{kit.description}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>معدات الحزمة والأسعار</CardTitle>
          <CardDescription>السعر اليومي الإجمالي قبل وبعد الخصم</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y rounded-md border">
            {kit.items.map((item) => (
              <li key={item.equipmentId} className="flex items-center justify-between px-3 py-2">
                <span>
                  {item.equipment.sku} {item.equipment.model ?? ''} × {item.quantity}
                </span>
                <span className="text-muted-foreground">
                  {formatCurrency(parseFloat(item.equipment.dailyPrice) * item.quantity)}/يوم
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <span className="text-muted-foreground">المجموع اليومي (قبل خصم):</span>{' '}
              {formatCurrency(kit.totalDailyRate)}
            </span>
            {kit.discountPercent && parseFloat(kit.discountPercent) > 0 && (
              <span>
                <span className="text-muted-foreground">بعد خصم {kit.discountPercent}%:</span>{' '}
                {formatCurrency(kit.finalDailyRate)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            تم الإنشاء: {formatDate(kit.createdAt)} — آخر تحديث: {formatDate(kit.updatedAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
