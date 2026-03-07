/**
 * FAQ form dialog – create or edit FAQ item (multi-language question + answer).
 * Shared between settings and CMS FAQ.
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
import type { CreateFaqInput } from '@/lib/validators/faq.validator'

export interface FaqItemForEdit {
  id: string
  questionAr: string
  questionEn: string
  questionZh: string | null
  answerAr: string
  answerEn: string
  answerZh: string | null
  order: number
  isActive: boolean
}

const defaultForm: CreateFaqInput = {
  questionAr: '',
  questionEn: '',
  questionZh: '',
  answerAr: '',
  answerEn: '',
  answerZh: '',
  order: 0,
  isActive: true,
}

export function FaqFormDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: FaqItemForEdit | null
  onSuccess: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CreateFaqInput>(defaultForm)

  const isEdit = Boolean(item?.id)

  useEffect(() => {
    if (item) {
      setForm({
        questionAr: item.questionAr,
        questionEn: item.questionEn,
        questionZh: item.questionZh ?? '',
        answerAr: item.answerAr,
        answerEn: item.answerEn,
        answerZh: item.answerZh ?? '',
        order: item.order,
        isActive: item.isActive,
      })
    } else {
      setForm(defaultForm)
    }
  }, [item, open])

  const update = (patch: Partial<CreateFaqInput>) => {
    setForm((f) => ({ ...f, ...patch }))
  }

  const handleSubmit = async () => {
    if (
      !form.questionAr?.trim() ||
      !form.questionEn?.trim() ||
      !form.answerAr?.trim() ||
      !form.answerEn?.trim()
    ) {
      toast({
        title: 'خطأ',
        description: 'السؤال والإجابة (عربي وإنجليزي) مطلوبة',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const payload = {
        questionAr: form.questionAr.trim(),
        questionEn: form.questionEn.trim(),
        questionZh: form.questionZh?.trim() || undefined,
        answerAr: form.answerAr.trim(),
        answerEn: form.answerEn.trim(),
        answerZh: form.answerZh?.trim() || undefined,
        order: form.order,
        isActive: form.isActive,
      }
      if (isEdit && item) {
        const res = await fetch(`/api/admin/faq/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Failed to update')
        }
        toast({ title: 'تم', description: 'تم تحديث السؤال' })
      } else {
        const res = await fetch('/api/admin/faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Failed to create')
        }
        toast({ title: 'تم', description: 'تم إضافة السؤال' })
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'تعديل السؤال' : 'إضافة سؤال شائع'}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="ar" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ar">عربي</TabsTrigger>
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="zh">中文</TabsTrigger>
          </TabsList>
          <TabsContent value="ar" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>السؤال (عربي)</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.questionAr}
                onChange={(e) => update({ questionAr: e.target.value })}
                placeholder="كيف أستأجر معدات؟"
              />
            </div>
            <div className="space-y-2">
              <Label>الإجابة (عربي)</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.answerAr}
                onChange={(e) => update({ answerAr: e.target.value })}
                placeholder="تصفح الكتالوج..."
              />
            </div>
          </TabsContent>
          <TabsContent value="en" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Question (English)</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.questionEn}
                onChange={(e) => update({ questionEn: e.target.value })}
                placeholder="How do I rent equipment?"
              />
            </div>
            <div className="space-y-2">
              <Label>Answer (English)</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.answerEn}
                onChange={(e) => update({ answerEn: e.target.value })}
                placeholder="Browse the catalog..."
              />
            </div>
          </TabsContent>
          <TabsContent value="zh" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>问题 (中文)</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.questionZh ?? ''}
                onChange={(e) => update({ questionZh: e.target.value })}
                placeholder="如何租赁设备？"
              />
            </div>
            <div className="space-y-2">
              <Label>答案 (中文)</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={form.answerZh ?? ''}
                onChange={(e) => update({ answerZh: e.target.value })}
                placeholder="浏览目录..."
              />
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex items-center justify-between border-t pt-4">
          <Label>نشط (يظهر في الصفحة الرئيسية)</Label>
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
