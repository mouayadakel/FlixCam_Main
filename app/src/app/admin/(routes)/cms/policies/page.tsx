/**
 * @file page.tsx
 * @description Admin – Policies list (CMS): add, edit, delete, reorder.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  FileText,
  ExternalLink,
} from 'lucide-react'
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
import { PolicyFormDialog, type PolicyItemForEdit } from '@/components/shared/policy-form-dialog'

interface PolicyListItem {
  id: string
  titleAr: string
  titleEn: string
  titleZh: string | null
  bodyAr: string
  bodyEn: string
  bodyZh: string | null
  order: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function CmsPoliciesPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<PolicyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PolicyItemForEdit | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  async function fetchItems() {
    try {
      const res = await fetch('/api/admin/policies')
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
    const policyIds = reordered.map((i) => i.id)
    setReordering(true)
    try {
      const res = await fetch('/api/admin/policies/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyIds }),
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
      const res = await fetch(`/api/admin/policies/${deletingId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast({ title: 'تم', description: 'تم حذف السياسة' })
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

  function openEdit(item: PolicyListItem) {
    setEditingItem({
      id: item.id,
      titleAr: item.titleAr,
      titleEn: item.titleEn,
      titleZh: item.titleZh,
      bodyAr: item.bodyAr,
      bodyEn: item.bodyEn,
      bodyZh: item.bodyZh,
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
            <FileText className="h-8 w-8" />
            السياسات (شروط التأجير)
          </h1>
          <p className="mt-1 text-muted-foreground">
            إدارة بنود صفحة السياسات: إضافة، تعديل، حذف، وترتيب
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/policies" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              <span className="me-2">عرض الصفحة العامة</span>
            </Link>
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" />
            <span className="me-2">إضافة سياسة</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة السياسات</CardTitle>
          <CardDescription>
            المحتوى يظهر في الصفحة العامة{' '}
            <Link href="/policies" target="_blank" rel="noopener noreferrer" className="underline">
              /policies
            </Link>
            . الترتيب يحدد ظهور البنود. استخدم الأسهم للأعلى/الأسفل.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                لا توجد سياسات. انقر &quot;إضافة سياسة&quot; لبدء الإضافة.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                إذا كنت تتوقع ظهور سياسات: سجّل الخروج ثم الدخول مرة أخرى، أو شغّل من المشروع:{' '}
                <code className="rounded bg-muted px-1.5 py-0.5">
                  npx tsx scripts/seed-policies.ts
                </code>
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchItems()}>
                إعادة المحاولة
              </Button>
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
                      {item.titleAr || item.titleEn || item.titleZh || '—'}
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

      <PolicyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editingItem}
        onSuccess={fetchItems}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف السياسة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه السياسة؟ لا يمكن التراجع.
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
