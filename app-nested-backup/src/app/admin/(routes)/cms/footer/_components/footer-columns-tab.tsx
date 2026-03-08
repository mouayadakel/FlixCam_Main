'use client'

import { useState, useEffect } from 'react'
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
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { FooterData } from '../page'

const LINK_TYPES = [
  { value: 'internal', label: 'صفحة داخلية' },
  { value: 'external', label: 'رابط خارجي' },
  { value: 'phone', label: 'هاتف' },
  { value: 'email', label: 'بريد' },
  { value: 'category', label: 'تصنيف' },
] as const

interface FooterColumnsTabProps {
  footer: FooterData | null
  onSave: () => void
}

type CategoryOption = { id: string; name: string; slug: string }

export function FooterColumnsTab({ footer, onSave }: FooterColumnsTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null)
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null)
  const [expandedColumnId, setExpandedColumnId] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const columns = footer?.columns ?? []

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : data?.categories ?? []))
      .catch(() => setCategories([]))
  }, [])

  const handleAddColumn = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/cms/footer/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleAr: 'عمود جديد',
          titleEn: 'New Column',
          showTitle: true,
          order: columns.length,
          enabled: true,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast({ title: 'تمت الإضافة' })
      onSave()
    } catch (e) {
      toast({ title: 'خطأ', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteColumn = async () => {
    if (!deleteColumnId) return
    setSaving(true)
    try {
      await fetch(`/api/admin/cms/footer/columns/${deleteColumnId}`, { method: 'DELETE' })
      toast({ title: 'تم الحذف' })
      setDeleteColumnId(null)
      onSave()
    } catch (e) {
      toast({ title: 'خطأ', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateColumn = async (
    id: string,
    data: { titleAr?: string; titleEn?: string; showTitle?: boolean }
  ) => {
    const col = columns.find((c) => c.id === id)
    if (!col) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/cms/footer/columns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleAr: data.titleAr ?? col.titleAr,
          titleEn: data.titleEn ?? col.titleEn,
          showTitle: data.showTitle ?? col.showTitle,
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

  const handleAddLink = async (columnId: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/cms/footer/columns/${columnId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textAr: 'رابط جديد',
          textEn: 'New Link',
          linkType: 'internal',
          url: '/',
          order: 999,
          enabled: true,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast({ title: 'تمت الإضافة' })
      onSave()
    } catch (e) {
      toast({ title: 'خطأ', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateLink = async (
    columnId: string,
    linkId: string,
    data: Partial<{
      textAr: string
      textEn: string
      linkType: string
      url: string
      openNewTab: boolean
      enabled: boolean
      categoryId: string | null
    }>
  ) => {
    const col = columns.find((c) => c.id === columnId)
    const link = col?.links.find((l) => l.id === linkId)
    if (!link) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/cms/footer/columns/${columnId}/links/${linkId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textAr: data.textAr ?? link.textAr,
          textEn: data.textEn ?? link.textEn,
          linkType: data.linkType ?? link.linkType,
          url: data.url ?? link.url,
          openNewTab: data.openNewTab ?? link.openNewTab,
          enabled: data.enabled ?? link.enabled,
          categoryId: data.categoryId !== undefined ? data.categoryId : link.categoryId ?? null,
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

  const handleDeleteLink = async () => {
    if (!deleteLinkId) return
    const [columnId, linkId] = deleteLinkId.split(':')
    if (!columnId || !linkId) return
    setSaving(true)
    try {
      await fetch(`/api/admin/cms/footer/columns/${columnId}/links/${linkId}`, { method: 'DELETE' })
      toast({ title: 'تم الحذف' })
      setDeleteLinkId(null)
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
            <CardTitle>أعمدة الفوتر والروابط</CardTitle>
            <CardDescription>أعمدة التصنيفات، عن الموقع، السياسات، إلخ</CardDescription>
          </div>
          <Button size="sm" onClick={handleAddColumn} disabled={saving}>
            <Plus className="h-4 w-4" />
            إضافة عمود
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {columns.map((col) => (
          <div key={col.id} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="grid flex-1 gap-2 sm:grid-cols-2 me-2">
                <Input
                  value={col.titleAr}
                  onChange={(e) => handleUpdateColumn(col.id, { titleAr: e.target.value })}
                  dir="rtl"
                  placeholder="العنوان عربي"
                />
                <Input
                  value={col.titleEn}
                  onChange={(e) => handleUpdateColumn(col.id, { titleEn: e.target.value })}
                  placeholder="Title English"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={col.showTitle}
                  onCheckedChange={(checked) => handleUpdateColumn(col.id, { showTitle: checked })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedColumnId(expandedColumnId === col.id ? null : col.id)}
                >
                  {expandedColumnId === col.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteColumnId(col.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {expandedColumnId === col.id && (
              <div className="me-4 space-y-4 border-e-2 pe-4">
                <div className="flex justify-between">
                  <Label>الروابط</Label>
                  <Button size="sm" variant="outline" onClick={() => handleAddLink(col.id)} disabled={saving}>
                    <Plus className="h-4 w-4" />
                    إضافة رابط
                  </Button>
                </div>
                {col.links.map((link) => (
                  <div key={link.id} className="rounded border p-3 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={link.textAr}
                        onChange={(e) => handleUpdateLink(col.id, link.id, { textAr: e.target.value })}
                        dir="rtl"
                        placeholder="النص عربي"
                      />
                      <Input
                        value={link.textEn}
                        onChange={(e) => handleUpdateLink(col.id, link.id, { textEn: e.target.value })}
                        placeholder="Link text"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Select
                        value={link.linkType}
                        onValueChange={(v) => handleUpdateLink(col.id, link.id, { linkType: v })}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LINK_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {link.linkType === 'category' ? (
                        <Select
                          value={link.categoryId ?? ''}
                          onValueChange={(value) =>
                            handleUpdateLink(col.id, link.id, {
                              categoryId: value || null,
                              url: value ? `/equipment?category=${value}` : '',
                            })
                          }
                        >
                          <SelectTrigger className="flex-1 min-w-40">
                            <SelectValue placeholder="اختر تصنيفاً" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={link.url}
                          onChange={(e) => handleUpdateLink(col.id, link.id, { url: e.target.value })}
                          placeholder="/path أو https://..."
                          className="flex-1 min-w-40"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={link.openNewTab}
                          onCheckedChange={(checked) => handleUpdateLink(col.id, link.id, { openNewTab: checked })}
                        />
                        <span className="text-xs">نافذة جديدة</span>
                      </div>
                      <Switch
                        checked={link.enabled}
                        onCheckedChange={(checked) => handleUpdateLink(col.id, link.id, { enabled: checked })}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteLinkId(`${col.id}:${link.id}`)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {columns.length === 0 && (
          <p className="text-muted-foreground text-sm">لا توجد أعمدة. اضغط إضافة عمود.</p>
        )}
      </CardContent>

      <AlertDialog open={!!deleteColumnId} onOpenChange={() => setDeleteColumnId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>حذف العمود؟</AlertDialogTitle>
          <AlertDialogDescription>سيتم حذف جميع روابط هذا العمود.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteColumn} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteLinkId} onOpenChange={() => setDeleteLinkId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>حذف الرابط؟</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLink} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
