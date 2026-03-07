/**
 * Policy form dialog – create or edit policy item (multi-language title + body).
 * Shared between settings and CMS policies.
 */

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
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { CreatePolicyInput } from '@/lib/validators/policy.validator'

export interface PolicyItemForEdit {
  id: string
  titleAr: string
  titleEn: string
  titleZh: string | null
  bodyAr: string
  bodyEn: string
  bodyZh: string | null
  order: number
  isActive: boolean
}

const defaultForm: CreatePolicyInput = {
  titleAr: '',
  titleEn: '',
  titleZh: '',
  bodyAr: '',
  bodyEn: '',
  bodyZh: '',
  order: 0,
  isActive: true,
}

export function PolicyFormDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: PolicyItemForEdit | null
  onSuccess: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CreatePolicyInput>(defaultForm)

  const isEdit = Boolean(item?.id)

  useEffect(() => {
    if (item) {
      setForm({
        titleAr: item.titleAr,
        titleEn: item.titleEn,
        titleZh: item.titleZh ?? '',
        bodyAr: item.bodyAr,
        bodyEn: item.bodyEn,
        bodyZh: item.bodyZh ?? '',
        order: item.order,
        isActive: item.isActive,
      })
    } else {
      setForm(defaultForm)
    }
  }, [item, open])

  const update = (patch: Partial<CreatePolicyInput>) => {
    setForm((f) => ({ ...f, ...patch }))
  }

  const handleSubmit = async () => {
    if (
      !form.titleAr?.trim() ||
      !form.titleEn?.trim() ||
      !form.bodyAr?.trim() ||
      !form.bodyEn?.trim()
    ) {
      toast({
        title: 'خطأ',
        description: 'العنوان والنص (عربي وإنجليزي) مطلوبة',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const payload = {
        titleAr: form.titleAr.trim(),
        titleEn: form.titleEn.trim(),
        titleZh: form.titleZh?.trim() || undefined,
        bodyAr: form.bodyAr.trim(),
        bodyEn: form.bodyEn.trim(),
        bodyZh: form.bodyZh?.trim() || undefined,
        order: form.order,
        isActive: form.isActive,
      }
      if (isEdit && item) {
        const res = await fetch(`/api/admin/policies/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Failed to update')
        }
        toast({ title: 'تم', description: 'تم تحديث السياسة' })
      } else {
        const res = await fetch('/api/admin/policies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Failed to create')
        }
        toast({ title: 'تم', description: 'تم إضافة السياسة' })
      }
      onSuccess()
      onOpenChange(false)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل السياسة' : 'إضافة سياسة'}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="ar" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ar">عربي</TabsTrigger>
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="zh">中文</TabsTrigger>
          </TabsList>
          <TabsContent value="ar" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>العنوان (عربي)</Label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.titleAr}
                onChange={(e) => update({ titleAr: e.target.value })}
                placeholder="مثال: التأمين والوديعة"
              />
            </div>
            <div className="space-y-2">
              <Label>النص (عربي)</Label>
              <textarea
                className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.bodyAr}
                onChange={(e) => update({ bodyAr: e.target.value })}
                placeholder="نص السياسة..."
              />
            </div>
          </TabsContent>
          <TabsContent value="en" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title (English)</Label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.titleEn}
                onChange={(e) => update({ titleEn: e.target.value })}
                placeholder="e.g. Insurance & Deposit"
              />
            </div>
            <div className="space-y-2">
              <Label>Body (English)</Label>
              <textarea
                className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.bodyEn}
                onChange={(e) => update({ bodyEn: e.target.value })}
                placeholder="Policy text..."
              />
            </div>
          </TabsContent>
          <TabsContent value="zh" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>标题 (中文)</Label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.titleZh ?? ''}
                onChange={(e) => update({ titleZh: e.target.value })}
                placeholder="例如：保险与押金"
              />
            </div>
            <div className="space-y-2">
              <Label>内容 (中文)</Label>
              <textarea
                className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.bodyZh ?? ''}
                onChange={(e) => update({ bodyZh: e.target.value })}
                placeholder="政策内容..."
              />
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex items-center justify-between border-t pt-4">
          <Label>نشط (يظهر في صفحة السياسات)</Label>
          <Switch checked={form.isActive} onCheckedChange={(v) => update({ isActive: v })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span className="me-2">{isEdit ? 'حفظ' : 'إضافة'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
