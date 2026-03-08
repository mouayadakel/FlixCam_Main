/**
 * @file page.tsx
 * @description Settings – Delivery zones & fees CRUD
 * @module app/admin/(routes)/settings/delivery-zones
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Truck, Plus, RefreshCw, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface DeliveryZoneRow {
  id: string
  name: string
  nameAr: string | null
  baseFee: number
  perKmFee: number | null
  minOrder: number | null
  leadTimeHrs: number
  isActive: boolean
  cities: string[]
  createdAt: string
  updatedAt: string
}

export default function SettingsDeliveryZonesPage() {
  const { toast } = useToast()
  const [zones, setZones] = useState<DeliveryZoneRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    nameAr: '',
    baseFee: '',
    perKmFee: '',
    minOrder: '',
    leadTimeHrs: '24',
    isActive: true,
    cities: '',
  })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/delivery-zones')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setZones(data.data ?? [])
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل مناطق التوصيل', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      name: '',
      nameAr: '',
      baseFee: '',
      perKmFee: '',
      minOrder: '',
      leadTimeHrs: '24',
      isActive: true,
      cities: '',
    })
    setDialogOpen(true)
  }

  const openEdit = (z: DeliveryZoneRow) => {
    setEditingId(z.id)
    setForm({
      name: z.name,
      nameAr: z.nameAr ?? '',
      baseFee: String(z.baseFee),
      perKmFee: z.perKmFee != null ? String(z.perKmFee) : '',
      minOrder: z.minOrder != null ? String(z.minOrder) : '',
      leadTimeHrs: String(z.leadTimeHrs),
      isActive: z.isActive,
      cities: Array.isArray(z.cities) ? z.cities.join(', ') : '',
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: 'خطأ', description: 'الاسم مطلوب', variant: 'destructive' })
      return
    }
    const baseFee = parseFloat(form.baseFee)
    if (Number.isNaN(baseFee) || baseFee < 0) {
      toast({
        title: 'خطأ',
        description: 'رسوم الأساس يجب أن تكون رقماً موجباً',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        nameAr: form.nameAr.trim() || null,
        baseFee,
        perKmFee: form.perKmFee ? parseFloat(form.perKmFee) : null,
        minOrder: form.minOrder ? parseFloat(form.minOrder) : null,
        leadTimeHrs: parseInt(form.leadTimeHrs, 10) || 24,
        isActive: form.isActive,
        cities: form.cities
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }
      if (editingId) {
        const res = await fetch(`/api/delivery-zones/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(await res.json().then((j: { error?: string }) => j.error))
        toast({ title: 'تم', description: 'تم تحديث منطقة التوصيل' })
      } else {
        const res = await fetch('/api/delivery-zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(await res.json().then((j: { error?: string }) => j.error))
        toast({ title: 'تم', description: 'تم إضافة منطقة التوصيل' })
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل الحفظ',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('حذف منطقة التوصيل؟')) return
    try {
      const res = await fetch(`/api/delivery-zones/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast({ title: 'تم', description: 'تم حذف منطقة التوصيل' })
      load()
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/settings">
              <ArrowLeft className="ms-1 h-4 w-4" />
              الإعدادات
            </Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Truck className="h-8 w-8" />
              مناطق التوصيل والرسوم
            </h1>
            <p className="mt-1 text-muted-foreground">
              المناطق، رسوم الأساس، رسوم الكيلو، الحد الأدنى للطلب
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`ms-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button onClick={openCreate}>
            <Plus className="ms-2 h-4 w-4" />
            منطقة جديدة
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة المناطق</CardTitle>
          <CardDescription>
            الاسم، المدن، رسوم الأساس، رسوم/كم، الحد الأدنى، مهلة التوصيل (ساعة)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>المدن</TableHead>
                  <TableHead>رسوم الأساس</TableHead>
                  <TableHead>رسوم/كم</TableHead>
                  <TableHead>الحد الأدنى</TableHead>
                  <TableHead>مهلة (س)</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="w-[100px]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8">
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : zones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      لا توجد مناطق. أضف منطقة جديدة.
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map((z) => (
                    <TableRow key={z.id}>
                      <TableCell className="font-medium">{z.nameAr || z.name}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                        {Array.isArray(z.cities) && z.cities.length ? z.cities.join(', ') : '—'}
                      </TableCell>
                      <TableCell>{z.baseFee} ر.س</TableCell>
                      <TableCell>{z.perKmFee != null ? `${z.perKmFee} ر.س` : '—'}</TableCell>
                      <TableCell>{z.minOrder != null ? `${z.minOrder} ر.س` : '—'}</TableCell>
                      <TableCell>{z.leadTimeHrs}</TableCell>
                      <TableCell>
                        <Badge variant={z.isActive ? 'default' : 'secondary'}>
                          {z.isActive ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(z)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => remove(z.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'تعديل منطقة التوصيل' : 'منطقة جديدة'}</DialogTitle>
            <DialogDescription>الاسم، المدن، الرسوم، المهلة</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>الاسم</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="اسم المنطقة"
              />
            </div>
            <div className="grid gap-2">
              <Label>الاسم (عربي)</Label>
              <Input
                value={form.nameAr}
                onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                placeholder="اختياري"
              />
            </div>
            <div className="grid gap-2">
              <Label>المدن (مفصولة بفاصلة)</Label>
              <Input
                value={form.cities}
                onChange={(e) => setForm((f) => ({ ...f, cities: e.target.value }))}
                placeholder="الرياض، جدة، ..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>رسوم الأساس (ر.س)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.baseFee}
                  onChange={(e) => setForm((f) => ({ ...f, baseFee: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>رسوم/كم (ر.س)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.perKmFee}
                  onChange={(e) => setForm((f) => ({ ...f, perKmFee: e.target.value }))}
                  placeholder="اختياري"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>الحد الأدنى للطلب (ر.س)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minOrder}
                  onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))}
                  placeholder="اختياري"
                />
              </div>
              <div className="grid gap-2">
                <Label>مهلة التوصيل (ساعة)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.leadTimeHrs}
                  onChange={(e) => setForm((f) => ({ ...f, leadTimeHrs: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="active">نشط</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={save} disabled={saving}>
              {editingId ? 'حفظ' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
