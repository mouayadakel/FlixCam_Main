'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2 } from 'lucide-react'
import type { FooterData } from '../page'

const CONTACT_ICONS = ['phone', 'envelope', 'location-dot'] as const

interface FooterContactTabProps {
  footer: FooterData | null
  onSave: () => void
}

export function FooterContactTab({ footer, onSave }: FooterContactTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const contacts = footer?.contacts ?? []

  const handleAdd = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/cms/footer/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'phone',
          labelAr: 'جديد',
          labelEn: 'New',
          value: '',
          icon: 'phone',
          whatsappEnabled: false,
          order: contacts.length,
          enabled: true,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast({ title: 'تمت الإضافة' })
      onSave()
    } catch (e) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/cms/footer/contacts/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      toast({ title: 'تم الحذف' })
      setDeleteId(null)
      onSave()
    } catch (e) {
      toast({ title: 'خطأ', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (
    id: string,
    data: {
      type?: string
      labelAr?: string
      labelEn?: string
      value?: string
      icon?: string | null
      whatsappEnabled?: boolean
      mapsLink?: string | null
      enabled?: boolean
    }
  ) => {
    const contact = contacts.find((c) => c.id === id)
    if (!contact) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/cms/footer/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.type ?? contact.type,
          labelAr: data.labelAr ?? contact.labelAr,
          labelEn: data.labelEn ?? contact.labelEn,
          value: data.value ?? contact.value,
          icon: data.icon !== undefined ? data.icon : contact.icon,
          whatsappEnabled: data.whatsappEnabled ?? contact.whatsappEnabled,
          mapsLink: data.mapsLink !== undefined ? data.mapsLink : contact.mapsLink,
          enabled: data.enabled ?? contact.enabled,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast({ title: 'تم التحديث' })
      onSave()
    } catch (e) {
      toast({ title: 'خطأ', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>جهات الاتصال</CardTitle>
            <CardDescription>هاتف، بريد، عنوان مع إمكانية واتساب وخريطة</CardDescription>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={saving}>
            <Plus className="h-4 w-4" />
            إضافة
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {contacts.map((c) => (
          <div key={c.id} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Select
                value={c.type}
                onValueChange={(v) => handleUpdate(c.id, { type: v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">هاتف</SelectItem>
                  <SelectItem value="email">بريد</SelectItem>
                  <SelectItem value="address">عنوان</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch
                  checked={c.enabled}
                  onCheckedChange={(checked) => handleUpdate(c.id, { enabled: checked })}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteId(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>التسمية (عربي)</Label>
                <Input
                  value={c.labelAr}
                  onChange={(e) => handleUpdate(c.id, { labelAr: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>التسمية (إنجليزي)</Label>
                <Input
                  value={c.labelEn}
                  onChange={(e) => handleUpdate(c.id, { labelEn: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>القيمة</Label>
              <Input
                value={c.value}
                onChange={(e) => handleUpdate(c.id, { value: e.target.value })}
                placeholder={c.type === 'phone' ? '+966...' : c.type === 'email' ? 'email@...' : 'العنوان'}
              />
            </div>
            <div className="space-y-2">
              <Label>الأيقونة</Label>
              <Select
                value={c.icon ?? 'phone'}
                onValueChange={(v) => handleUpdate(c.id, { icon: v })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_ICONS.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      {icon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {c.type === 'phone' && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={c.whatsappEnabled}
                  onCheckedChange={(checked) => handleUpdate(c.id, { whatsappEnabled: checked })}
                />
                <Label>ربط واتساب</Label>
              </div>
            )}
            {c.type === 'address' && (
              <div className="space-y-2">
                <Label>رابط خرائط جوجل</Label>
                <Input
                  value={c.mapsLink ?? ''}
                  onChange={(e) => handleUpdate(c.id, { mapsLink: e.target.value || null })}
                  placeholder="https://maps.google.com/..."
                />
              </div>
            )}
          </div>
        ))}
        {contacts.length === 0 && (
          <p className="text-muted-foreground text-sm">لا توجد جهات اتصال. اضغط إضافة.</p>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>حذف جهة الاتصال؟</AlertDialogTitle>
          <AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
