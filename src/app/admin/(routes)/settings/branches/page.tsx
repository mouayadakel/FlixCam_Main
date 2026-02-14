/**
 * @file page.tsx
 * @description Settings – Branches/Locations CRUD
 * @module app/admin/(routes)/settings/branches
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Plus, RefreshCw, Pencil, Trash2, ArrowLeft } from 'lucide-react'
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

interface Branch {
  id: string
  name: string
  nameAr: string | null
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  isActive: boolean
  latitude: number | null
  longitude: number | null
  workingHours: unknown
  createdAt: string
  updatedAt: string
}

export default function SettingsBranchesPage() {
  const { toast } = useToast()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', nameAr: '', address: '', city: '', phone: '', email: '', isActive: true })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/branches')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setBranches(data.data ?? [])
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل الفروع', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm({ name: '', nameAr: '', address: '', city: '', phone: '', email: '', isActive: true })
    setDialogOpen(true)
  }

  const openEdit = (b: Branch) => {
    setEditingId(b.id)
    setForm({
      name: b.name,
      nameAr: b.nameAr ?? '',
      address: b.address ?? '',
      city: b.city ?? '',
      phone: b.phone ?? '',
      email: b.email ?? '',
      isActive: b.isActive,
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: 'خطأ', description: 'الاسم مطلوب', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch(`/api/branches/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            nameAr: form.nameAr.trim() || null,
            address: form.address.trim() || null,
            city: form.city.trim() || null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            isActive: form.isActive,
          }),
        })
        if (!res.ok) throw new Error(await res.json().then((j) => j.error))
        toast({ title: 'تم', description: 'تم تحديث الفرع' })
      } else {
        const res = await fetch('/api/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            nameAr: form.nameAr.trim() || null,
            address: form.address.trim() || null,
            city: form.city.trim() || null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            isActive: form.isActive,
          }),
        })
        if (!res.ok) throw new Error(await res.json().then((j) => j.error))
        toast({ title: 'تم', description: 'تم إضافة الفرع' })
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'فشل الحفظ', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('حذف هذا الفرع؟')) return
    try {
      const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast({ title: 'تم', description: 'تم حذف الفرع' })
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
              <ArrowLeft className="h-4 w-4 ml-1" />
              الإعدادات
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MapPin className="h-8 w-8" />
              الفروع / المواقع
            </h1>
            <p className="text-muted-foreground mt-1">إدارة فروع الشركة ومواقعها</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 ml-2" />
            فرع جديد
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الفروع</CardTitle>
          <CardDescription>العنوان، المدينة، الهاتف، ساعات العمل، والحالة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>العنوان / المدينة</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="w-[120px]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8">
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : branches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      لا توجد فروع. أضف فرعاً جديداً.
                    </TableCell>
                  </TableRow>
                ) : (
                  branches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.nameAr || b.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[b.address, b.city].filter(Boolean).join('، ') || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{b.phone || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={b.isActive ? 'default' : 'secondary'}>
                          {b.isActive ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(b.id)}>
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
            <DialogTitle>{editingId ? 'تعديل الفرع' : 'فرع جديد'}</DialogTitle>
            <DialogDescription>الاسم والعنوان والاتصال والحالة</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>الاسم</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="اسم الفرع" />
            </div>
            <div className="grid gap-2">
              <Label>الاسم (عربي)</Label>
              <Input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} placeholder="اختياري" />
            </div>
            <div className="grid gap-2">
              <Label>العنوان</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="اختياري" />
            </div>
            <div className="grid gap-2">
              <Label>المدينة</Label>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="اختياري" />
            </div>
            <div className="grid gap-2">
              <Label>الهاتف</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="اختياري" />
            </div>
            <div className="grid gap-2">
              <Label>البريد</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="اختياري" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="isActive">نشط</Label>
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
