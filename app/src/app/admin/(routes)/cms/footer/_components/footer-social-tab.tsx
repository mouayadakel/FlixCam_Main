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

const SOCIAL_PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'custom', label: 'Custom' },
] as const

interface FooterSocialTabProps {
  footer: FooterData | null
  onSave: () => void
}

export function FooterSocialTab({ footer, onSave }: FooterSocialTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const socialLinks = footer?.socialLinks ?? []

  const handleAdd = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/cms/footer/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'instagram',
          url: 'https://instagram.com/',
          order: socialLinks.length,
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

  const handleDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/cms/footer/social/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      toast({ title: 'تم الحذف' })
      setDeleteId(null)
      onSave()
    } catch (e) {
      toast({ title: 'خطأ', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (
    id: string,
    data: Partial<{ platform: string; url: string; displayNameAr: string | null; displayNameEn: string | null; enabled: boolean }>
  ) => {
    const link = socialLinks.find((l) => l.id === id)
    if (!link) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/cms/footer/social/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: data.platform ?? link.platform,
          url: data.url ?? link.url,
          displayNameAr: data.displayNameAr !== undefined ? data.displayNameAr : link.displayNameAr,
          displayNameEn: data.displayNameEn !== undefined ? data.displayNameEn : link.displayNameEn,
          enabled: data.enabled ?? link.enabled,
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
            <CardTitle>وسائل التواصل</CardTitle>
            <CardDescription>روابط منصات التواصل الاجتماعي</CardDescription>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={saving}>
            <Plus className="h-4 w-4" />
            إضافة
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {socialLinks.map((link) => (
          <div key={link.id} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Select
                value={link.platform}
                onValueChange={(v) => handleUpdate(link.id, { platform: v })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch
                  checked={link.enabled}
                  onCheckedChange={(checked) => handleUpdate(link.id, { enabled: checked })}
                />
                <Button variant="destructive" size="sm" onClick={() => setDeleteId(link.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>الرابط</Label>
              <Input
                value={link.url}
                onChange={(e) => handleUpdate(link.id, { url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>اسم العرض (عربي)</Label>
                <Input
                  value={link.displayNameAr ?? ''}
                  onChange={(e) => handleUpdate(link.id, { displayNameAr: e.target.value || null })}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>اسم العرض (إنجليزي)</Label>
                <Input
                  value={link.displayNameEn ?? ''}
                  onChange={(e) => handleUpdate(link.id, { displayNameEn: e.target.value || null })}
                />
              </div>
            </div>
          </div>
        ))}
        {socialLinks.length === 0 && (
          <p className="text-muted-foreground text-sm">لا توجد روابط. اضغط إضافة.</p>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>حذف الرابط؟</AlertDialogTitle>
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
