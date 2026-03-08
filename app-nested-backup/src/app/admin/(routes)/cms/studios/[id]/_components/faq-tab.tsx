/**
 * FAQ tab: CRUD for studio FAQs (max 9), reorder
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
import { ChevronUp, ChevronDown, Pencil, Trash2, Loader2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface StudioFaq {
  id: string
  questionAr: string
  questionEn: string | null
  questionZh: string | null
  answerAr: string
  answerEn: string | null
  answerZh: string | null
  order: number
}

const MAX_FAQS = 9

interface FaqTabProps {
  studioId: string
  onRefresh: () => void
}

export function CmsStudioFaqTab({ studioId, onRefresh }: FaqTabProps) {
  const { toast } = useToast()
  const [faqs, setFaqs] = useState<StudioFaq[]>([])
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    questionAr: '',
    questionEn: '',
    questionZh: '',
    answerAr: '',
    answerEn: '',
    answerZh: '',
  })

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/faqs`)
      if (res.ok) {
        const json = await res.json()
        setFaqs(json.data ?? [])
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
      questionAr: '',
      questionEn: '',
      questionZh: '',
      answerAr: '',
      answerEn: '',
      answerZh: '',
    })
    setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (faq: StudioFaq) => {
    setForm({
      questionAr: faq.questionAr,
      questionEn: faq.questionEn ?? '',
      questionZh: faq.questionZh ?? '',
      answerAr: faq.answerAr,
      answerEn: faq.answerEn ?? '',
      answerZh: faq.answerZh ?? '',
    })
    setEditingId(faq.id)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      questionAr: form.questionAr.trim(),
      questionEn: form.questionEn.trim() || undefined,
      questionZh: form.questionZh.trim() || undefined,
      answerAr: form.answerAr.trim(),
      answerEn: form.answerEn.trim() || undefined,
      answerZh: form.answerZh.trim() || undefined,
    }
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/studios/${studioId}/faqs/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed')
        }
        toast({ title: 'تم', description: 'تم تحديث السؤال' })
      } else {
        const res = await fetch(`/api/admin/studios/${studioId}/faqs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed')
        }
        toast({ title: 'تم', description: 'تم إضافة السؤال' })
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

  const handleDelete = async (faqId: string) => {
    if (!confirm('حذف هذا السؤال؟')) return
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/faqs/${faqId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      setFaqs((prev) => prev.filter((f) => f.id !== faqId))
      toast({ title: 'تم', description: 'تم حذف السؤال' })
      onRefresh()
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' })
    }
  }

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= faqs.length) return
    const reordered = [...faqs]
    ;[reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]]
    const faqIds = reordered.map((f) => f.id)
    setReordering(true)
    try {
      const res = await fetch(`/api/admin/studios/${studioId}/faqs/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faqIds }),
      })
      if (!res.ok) throw new Error('Reorder failed')
      setFaqs(reordered)
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
          <CardTitle>الأسئلة الشائعة</CardTitle>
          <CardDescription>حد أقصى {MAX_FAQS} أسئلة لكل استوديو</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} disabled={faqs.length >= MAX_FAQS}>
              <Plus className="h-4 w-4" />
              <span className="me-2">إضافة</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'تعديل السؤال' : 'إضافة سؤال'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="faq-questionAr">السؤال (عربي) *</Label>
                <Input
                  id="faq-questionAr"
                  value={form.questionAr}
                  onChange={(e) => setForm((f) => ({ ...f, questionAr: e.target.value }))}
                  required
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faq-answerAr">الإجابة (عربي) *</Label>
                <Textarea
                  id="faq-answerAr"
                  value={form.answerAr}
                  onChange={(e) => setForm((f) => ({ ...f, answerAr: e.target.value }))}
                  required
                  rows={3}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faq-questionEn">السؤال (EN)</Label>
                <Input
                  id="faq-questionEn"
                  value={form.questionEn}
                  onChange={(e) => setForm((f) => ({ ...f, questionEn: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faq-answerEn">الإجابة (EN)</Label>
                <Textarea
                  id="faq-answerEn"
                  value={form.answerEn}
                  onChange={(e) => setForm((f) => ({ ...f, answerEn: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faq-questionZh">السؤال (中文)</Label>
                <Input
                  id="faq-questionZh"
                  value={form.questionZh}
                  onChange={(e) => setForm((f) => ({ ...f, questionZh: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faq-answerZh">الإجابة (中文)</Label>
                <Textarea
                  id="faq-answerZh"
                  value={form.answerZh}
                  onChange={(e) => setForm((f) => ({ ...f, answerZh: e.target.value }))}
                  rows={2}
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
          {faqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد أسئلة</p>
          ) : (
            faqs.map((faq, i) => (
              <div key={faq.id} className="flex items-center justify-between rounded-lg border p-3">
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
                      disabled={i === faqs.length - 1 || reordering}
                      onClick={() => moveItem(i, 'down')}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <p className="font-medium">{faq.questionAr}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{faq.answerAr}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(faq)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(faq.id)}
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
