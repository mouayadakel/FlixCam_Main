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
import { useToast } from '@/hooks/use-toast'
import type { FooterData } from '../page'

interface FooterGeneralTabProps {
  footer: FooterData | null
  onSave: () => void
}

export function FooterGeneralTab({ footer, onSave }: FooterGeneralTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(footer?.enabled ?? true)
  const [layout, setLayout] = useState(footer?.layout ?? 'default')
  const [backgroundColor, setBackgroundColor] = useState(footer?.backgroundColor ?? '#1a1a1a')
  const [textColor, setTextColor] = useState(footer?.textColor ?? '#ffffff')
  const [linkColor, setLinkColor] = useState(footer?.linkColor ?? '#10b981')
  const [linkHoverColor, setLinkHoverColor] = useState(footer?.linkHoverColor ?? '#34d399')

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/cms/footer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          layout,
          backgroundColor,
          textColor,
          linkColor,
          linkHoverColor,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save')
      }
      toast({ title: 'تم الحفظ', description: 'تم تحديث الإعدادات العامة' })
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>الإعدادات العامة</CardTitle>
        <CardDescription>تفعيل الفوتر ومظهره الأساسي</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label>تفعيل الفوتر</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="space-y-2">
          <Label>التخطيط</Label>
          <Select value={layout} onValueChange={setLayout}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">افتراضي</SelectItem>
              <SelectItem value="minimal">بسيط</SelectItem>
              <SelectItem value="extended">موسّع</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>لون الخلفية</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="h-10 w-14 p-1"
              />
              <Input
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>لون النص</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-10 w-14 p-1"
              />
              <Input
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>لون الروابط</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={linkColor}
                onChange={(e) => setLinkColor(e.target.value)}
                className="h-10 w-14 p-1"
              />
              <Input
                value={linkColor}
                onChange={(e) => setLinkColor(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>لون الروابط عند التمرير</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={linkHoverColor}
                onChange={(e) => setLinkHoverColor(e.target.value)}
                className="h-10 w-14 p-1"
              />
              <Input
                value={linkHoverColor}
                onChange={(e) => setLinkHoverColor(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات العامة'}
        </Button>
      </CardContent>
    </Card>
  )
}
