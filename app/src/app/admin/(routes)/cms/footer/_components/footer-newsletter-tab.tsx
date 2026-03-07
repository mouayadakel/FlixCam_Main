'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import type { FooterData } from '../page'

interface FooterNewsletterTabProps {
  footer: FooterData | null
  onSave: () => void
}

export function FooterNewsletterTab({ footer, onSave }: FooterNewsletterTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const newsletter = footer?.newsletter
  const [enabled, setEnabled] = useState(newsletter?.enabled ?? false)
  const [titleAr, setTitleAr] = useState(newsletter?.titleAr ?? '')
  const [titleEn, setTitleEn] = useState(newsletter?.titleEn ?? '')
  const [descriptionAr, setDescriptionAr] = useState(newsletter?.descriptionAr ?? '')
  const [descriptionEn, setDescriptionEn] = useState(newsletter?.descriptionEn ?? '')
  const [placeholderAr, setPlaceholderAr] = useState(newsletter?.placeholderAr ?? '')
  const [placeholderEn, setPlaceholderEn] = useState(newsletter?.placeholderEn ?? '')
  const [buttonTextAr, setButtonTextAr] = useState(newsletter?.buttonTextAr ?? '')
  const [buttonTextEn, setButtonTextEn] = useState(newsletter?.buttonTextEn ?? '')
  const [successMessageAr, setSuccessMessageAr] = useState(newsletter?.successMessageAr ?? '')
  const [successMessageEn, setSuccessMessageEn] = useState(newsletter?.successMessageEn ?? '')

  useEffect(() => {
    if (footer?.newsletter) {
      const n = footer.newsletter
      setEnabled(n.enabled)
      setTitleAr(n.titleAr)
      setTitleEn(n.titleEn)
      setDescriptionAr(n.descriptionAr)
      setDescriptionEn(n.descriptionEn)
      setPlaceholderAr(n.placeholderAr)
      setPlaceholderEn(n.placeholderEn)
      setButtonTextAr(n.buttonTextAr)
      setButtonTextEn(n.buttonTextEn)
      setSuccessMessageAr(n.successMessageAr)
      setSuccessMessageEn(n.successMessageEn)
    }
  }, [footer?.newsletter])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/cms/footer/newsletter', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          titleAr: titleAr || 'اشترك في النشرة البريدية',
          titleEn: titleEn || 'Subscribe to Newsletter',
          descriptionAr: descriptionAr || '',
          descriptionEn: descriptionEn || '',
          placeholderAr: placeholderAr || 'أدخل بريدك',
          placeholderEn: placeholderEn || 'Enter your email',
          buttonTextAr: buttonTextAr || 'اشترك',
          buttonTextEn: buttonTextEn || 'Subscribe',
          successMessageAr: successMessageAr || 'تم الاشتراك بنجاح!',
          successMessageEn: successMessageEn || 'Successfully subscribed!',
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save')
      }
      toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات النشرة البريدية' })
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>النشرة البريدية</CardTitle>
            <CardDescription>نموذج الاشتراك في الفوتر</CardDescription>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {enabled && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>العنوان (عربي)</Label>
                <Input
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  dir="rtl"
                  placeholder="اشترك في النشرة البريدية"
                />
              </div>
              <div className="space-y-2">
                <Label>العنوان (إنجليزي)</Label>
                <Input
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="Subscribe to Newsletter"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>الوصف (عربي)</Label>
                <Textarea
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  dir="rtl"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف (إنجليزي)</Label>
                <Textarea
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>نص placeholder (عربي)</Label>
                <Input
                  value={placeholderAr}
                  onChange={(e) => setPlaceholderAr(e.target.value)}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>نص placeholder (إنجليزي)</Label>
                <Input
                  value={placeholderEn}
                  onChange={(e) => setPlaceholderEn(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>نص الزر (عربي)</Label>
                <Input
                  value={buttonTextAr}
                  onChange={(e) => setButtonTextAr(e.target.value)}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>نص الزر (إنجليزي)</Label>
                <Input
                  value={buttonTextEn}
                  onChange={(e) => setButtonTextEn(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>رسالة النجاح (عربي)</Label>
                <Input
                  value={successMessageAr}
                  onChange={(e) => setSuccessMessageAr(e.target.value)}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>رسالة النجاح (إنجليزي)</Label>
                <Input
                  value={successMessageEn}
                  onChange={(e) => setSuccessMessageEn(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ إعدادات النشرة البريدية'}
        </Button>
      </CardContent>
    </Card>
  )
}
