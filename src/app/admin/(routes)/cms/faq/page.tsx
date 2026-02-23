/**
 * @file page.tsx
 * @description Admin – FAQ list (CMS): add, edit, delete, reorder.
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Pencil, Trash2, ChevronUp, ChevronDown, HelpCircle } from 'lucide-react'
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
import { FaqFormDialog, type FaqItemForEdit } from '@/components/shared/faq-form-dialog'

interface FaqListItem {
  id: string
  questionAr: string
  questionEn: string
  questionZh: string | null
  answerAr: string
  answerEn: string
  answerZh: string | null
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function CmsFaqPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<FaqListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FaqItemForEdit | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  async function fetchItems() {
    try {
      const res = await fetch('/api/admin/faq')
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setItems(json.data ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  async function moveItem(itemId: string, direction: 'up' | 'down') {
    const idx = items.findIndex((i) => i.id === itemId)
    if (idx < 0) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= items.length) return
    const reordered = [...items]
    const [removed] = reordered.splice(idx, 1)
    reordered.splice(newIdx, 0, removed)
    const faqIds = reordered.map((i) => i.id)
    setReordering(true)
    try {
      const res = await fetch('/api/admin/faq/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faqIds }),
      })
      if (!res.ok) throw new Error('Reorder failed')
      toast({ title: 'تم', description: 'تم تغيير الترتيب' })
      fetchItems()
    } catch {
      toast({ title: 'خطأ', description: 'فشل تغيير الترتيب', variant: 'destructive' })
    } finally {
      setReordering(false)
    }
  }

  async function confirmDelete() {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/admin/faq/${deletingId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast({ title: 'تم', description: 'تم حذف السؤال' })
      setDeleteOpen(false)
      setDeletingId(null)
      fetchItems()
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحذف', variant: 'destructive' })
    }
  }

  function openAdd() {
    setEditingItem(null)
    setFormOpen(true)
  }

  function openEdit(item: FaqListItem) {
    setEditingItem({
      id: item.id,
      questionAr: item.questionAr,
      questionEn: item.questionEn,
      questionZh: item.questionZh,
      answerAr: item.answerAr,
      answerEn: item.answerEn,
      answerZh: item.answerZh,
      order: item.order,
      isActive: item.isActive,
    })
    setFormOpen(true)
  }

  function openDelete(itemId: string) {
    setDeletingId(itemId)
    setDeleteOpen(true)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <HelpCircle className="h-8 w-8" />
            الأسئلة الشائعة (FAQ)
          </h1>
          <p className="mt-1 text-muted-foreground">
            إدارة أسئلة الصفحة الرئيسية: إضافة، تعديل، حذف، وترتيب
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          <span className="mr-2">إضافة سؤال</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الأسئلة</CardTitle>
          <CardDescription>
            الترتيب يحدد ظهور الأسئلة في الصفحة الرئيسية. استخدم الأسهم للأعلى/الأسفل.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              لا توجد أسئلة. انقر &quot;إضافة سؤال&quot; لبدء الإضافة.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50"
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === 0 || reordering}
                      onClick={() => moveItem(item.id, 'up')}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === items.length - 1 || reordering}
                      onClick={() => moveItem(item.id, 'down')}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {item.questionAr || item.questionEn || item.questionZh || '—'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      ترتيب {item.order + 1}
                      {!item.isActive && <Badge variant="secondary">معطّل</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => openDelete(item.id)}
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

      <FaqFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
        onSuccess={fetchItems}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف السؤال</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا السؤال؟ لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
