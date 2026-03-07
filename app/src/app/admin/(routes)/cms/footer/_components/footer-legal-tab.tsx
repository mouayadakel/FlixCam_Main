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
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2 } from 'lucide-react'
import type { FooterData } from '../page'

interface FooterLegalTabProps {
  footer: FooterData | null
  onSave: () => void
}

type LegalLinkItem = { id?: string; textAr: string; textEn: string; url: string; order: number; enabled: boolean }

export function FooterLegalTab({ footer, onSave }: FooterLegalTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [deleteLinkIndex, setDeleteLinkIndex] = useState<number | null>(null)
  const legal = footer?.legal
  const [copyrightAr, setCopyrightAr] = useState(legal?.copyrightAr ?? '')
  const [copyrightEn, setCopyrightEn] = useState(legal?.copyrightEn ?? '')
  const [autoYear, setAutoYear] = useState(legal?.autoYear ?? true)
  const [layout, setLayout] = useState(legal?.layout ?? 'center')
  const [links, setLinks] = useState<LegalLinkItem[]>([])

  useEffect(() => {
    if (legal) {
      setCopyrightAr(legal.copyrightAr)
      setCopyrightEn(legal.copyrightEn)
      setAutoYear(legal.autoYear)
      setLayout(legal.layout)
      setLinks(
        (legal.links ?? []).map((l) => ({
          id: l.id,
          textAr: l.textAr,
          textEn: l.textEn,
          url: l.url,
          order: l.order,
          enabled: l.enabled,
        }))
      )
    }
  }, [legal])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/cms/footer/legal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copyrightAr,
          copyrightEn,
          autoYear,
          layout,
          links: links.map((l, i) => ({
            textAr: l.textAr,
            textEn: l.textEn,
            url: l.url,
            order: i,
            enabled: l.enabled,
          })),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save')
      }
      toast({ title: 'تم الحفظ', description: 'تم تحديث القسم القانوني' })
      onSave()
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'Failed to save',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const addLink = () => {
    setLinks((prev) => [
      ...prev,
      { textAr: '', textEn: '', url: '', order: prev.length, enabled: true },
    ])
  }

  const updateLink = (index: number, data: Partial<LegalLinkItem>) => {
    setLinks((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...data }
      return next
    })
  }

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index))
    setDeleteLinkIndex(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>القسم القانوني وحقوق النشر</CardTitle>
        <CardDescription>نص حقوق النشر وروابط الشروط والخصوصية</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>نص حقوق النشر (عربي)</Label>
            <Input
              value={copyrightAr}
              onChange={(e) => setCopyrightAr(e.target.value)}
              dir="rtl"
              placeholder="© {year} جميع الحقوق محفوظة"
            />
          </div>
          <div className="space-y-2">
            <Label>نص حقوق النشر (إنجليزي)</Label>
            <Input
              value={copyrightEn}
              onChange={(e) => setCopyrightEn(e.target.value)}
              placeholder="© {year} All rights reserved"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label>تحديث السنة تلقائياً</Label>
          <Switch checked={autoYear} onCheckedChange={setAutoYear} />
        </div>
        <div className="space-y-2">
          <Label>محاذاة القسم</Label>
          <Select value={layout} onValueChange={setLayout}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">يسار</SelectItem>
              <SelectItem value="center">وسط</SelectItem>
              <SelectItem value="right">يمين</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>روابط قانونية</Label>
            <Button size="sm" variant="outline" onClick={addLink}>
              <Plus className="h-4 w-4" />
              إضافة رابط
            </Button>
          </div>
          {links.map((link, index) => (
            <div key={index} className="flex gap-2 items-end rounded border p-3 mb-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-3">
                <Input
                  value={link.textAr}
                  onChange={(e) => updateLink(index, { textAr: e.target.value })}
                  dir="rtl"
                  placeholder="النص عربي"
                />
                <Input
                  value={link.textEn}
                  onChange={(e) => updateLink(index, { textEn: e.target.value })}
                  placeholder="Text En"
                />
                <Input
                  value={link.url}
                  onChange={(e) => updateLink(index, { url: e.target.value })}
                  placeholder="/policies"
                />
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteLinkIndex(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ القسم القانوني'}
        </Button>
      </CardContent>

      <AlertDialog open={deleteLinkIndex !== null} onOpenChange={() => setDeleteLinkIndex(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>حذف الرابط؟</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLinkIndex !== null && removeLink(deleteLinkIndex)}
              className="bg-destructive text-destructive-foreground"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
