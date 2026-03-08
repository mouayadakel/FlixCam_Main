'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Sparkles, ExternalLink, MousePointer } from 'lucide-react'
import type { FooterData } from '../page'

const HOVER_EFFECTS = [
  { value: 'lift', labelAr: 'رفع', labelEn: 'Lift', descAr: 'يرتفع الأيقونة قليلاً مع ظل', descEn: 'Icon lifts slightly with shadow' },
  { value: 'scale', labelAr: 'تكبير', labelEn: 'Scale', descAr: 'تكبير بسيط عند التمرير', descEn: 'Slight scale on hover' },
  { value: 'glow', labelAr: 'توهج', labelEn: 'Glow', descAr: 'توهج حول الأيقونة بلون محدد', descEn: 'Glow around icon with chosen color' },
  { value: 'background', labelAr: 'لون خلفية', labelEn: 'Background', descAr: 'تعبئة الخلفية بلون محدد', descEn: 'Fill background with chosen color' },
] as const

interface FooterIconsEffectsTabProps {
  footer: FooterData | null
  onSave: () => void
}

export function FooterIconsEffectsTab({ footer, onSave }: FooterIconsEffectsTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [socialHoverEffect, setSocialHoverEffect] = useState<string>(
    footer?.socialHoverEffect ?? 'lift'
  )
  const [socialHoverColor, setSocialHoverColor] = useState<string>(
    footer?.socialHoverColor ?? '#10b981'
  )

  useEffect(() => {
    if (footer?.socialHoverEffect) setSocialHoverEffect(footer.socialHoverEffect)
    if (footer?.socialHoverColor) setSocialHoverColor(footer.socialHoverColor)
  }, [footer?.socialHoverEffect, footer?.socialHoverColor])

  const needsHoverColor = socialHoverEffect === 'glow' || socialHoverEffect === 'background'

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/cms/footer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socialHoverEffect,
          socialHoverColor: needsHoverColor ? socialHoverColor : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save')
      }
      toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات الأيقونات والتأثيرات' })
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            تأثير التمرير على أيقونات وسائل التواصل
          </CardTitle>
          <CardDescription>
            اختر كيف تظهر أيقونات وسائل التواصل عند تمرير المؤشر عليها في الفوتر.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>نوع التأثير</Label>
            <Select value={socialHoverEffect} onValueChange={setSocialHoverEffect}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOVER_EFFECTS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    <span className="flex flex-col">
                      <span>{e.labelAr} / {e.labelEn}</span>
                      <span className="text-muted-foreground text-xs font-normal">{e.descAr}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsHoverColor && (
            <div className="space-y-2">
              <Label>لون التمرير</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="color"
                  value={socialHoverColor}
                  onChange={(e) => setSocialHoverColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={socialHoverColor}
                  onChange={(e) => setSocialHoverColor(e.target.value)}
                  placeholder="#10b981"
                  className="w-32 font-mono"
                />
              </div>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'جاري الحفظ...' : 'حفظ التأثيرات'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            الروابط والتوجيه
          </CardTitle>
          <CardDescription>
            أين تضبط الروابط وفتحها في نافذة جديدة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
            <MousePointer className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">روابط وسائل التواصل</p>
              <p className="text-muted-foreground">
                تفتح دائماً في نافذة جديدة (target="_blank"). الرابط والعنوان يضبطان من تبويب «وسائل التواصل».
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
            <ExternalLink className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">روابط الأعمدة</p>
              <p className="text-muted-foreground">
                لكل رابط في تبويب «الأعمدة والروابط» يمكن تفعيل «فتح في نافذة جديدة» بشكل منفصل.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
