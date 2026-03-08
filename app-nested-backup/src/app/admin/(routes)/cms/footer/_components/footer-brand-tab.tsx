'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ImageUpload } from '@/components/forms/image-upload'
import { useToast } from '@/hooks/use-toast'
import type { FooterData } from '../page'

interface FooterBrandTabProps {
  footer: FooterData | null
  onSave: () => void
}

export function FooterBrandTab({ footer, onSave }: FooterBrandTabProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const brand = footer?.brand
  const [logoLight, setLogoLight] = useState(brand?.logoLight ?? '')
  const [logoDark, setLogoDark] = useState(brand?.logoDark ?? '')
  const [companyNameAr, setCompanyNameAr] = useState(brand?.companyNameAr ?? '')
  const [companyNameEn, setCompanyNameEn] = useState(brand?.companyNameEn ?? '')
  const [descriptionAr, setDescriptionAr] = useState(brand?.descriptionAr ?? '')
  const [descriptionEn, setDescriptionEn] = useState(brand?.descriptionEn ?? '')
  const [showBrand, setShowBrand] = useState(brand?.showBrand ?? true)

  useEffect(() => {
    if (footer?.brand) {
      setLogoLight(footer.brand.logoLight)
      setLogoDark(footer.brand.logoDark)
      setCompanyNameAr(footer.brand.companyNameAr)
      setCompanyNameEn(footer.brand.companyNameEn)
      setDescriptionAr(footer.brand.descriptionAr)
      setDescriptionEn(footer.brand.descriptionEn)
      setShowBrand(footer.brand.showBrand)
    }
  }, [footer?.brand])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/cms/footer/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoLight: logoLight || '/logos/flixcam-light.svg',
          logoDark: logoDark || '/logos/flixcam-dark.svg',
          companyNameAr: companyNameAr || 'فليكس كام',
          companyNameEn: companyNameEn || 'Flixcam',
          descriptionAr,
          descriptionEn,
          showBrand,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save')
      }
      toast({ title: 'تم الحفظ', description: 'تم تحديث العلامة' })
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
        <CardTitle>معلومات العلامة</CardTitle>
        <CardDescription>الشعار واسم الشركة والوصف في الفوتر</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>الشعار (نسخة فاتحة)</Label>
          <ImageUpload
            value={logoLight}
            onChange={setLogoLight}
            label="الشعار الفاتح"
          />
        </div>
        <div className="space-y-2">
          <Label>الشعار (نسخة داكنة)</Label>
          <ImageUpload
            value={logoDark}
            onChange={setLogoDark}
            label="الشعار الداكن"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>اسم الشركة (عربي)</Label>
            <Input
              value={companyNameAr}
              onChange={(e) => setCompanyNameAr(e.target.value)}
              dir="rtl"
              placeholder="فليكس كام"
            />
          </div>
          <div className="space-y-2">
            <Label>اسم الشركة (إنجليزي)</Label>
            <Input
              value={companyNameEn}
              onChange={(e) => setCompanyNameEn(e.target.value)}
              placeholder="Flixcam"
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
              rows={3}
              placeholder="وصف قصير..."
            />
          </div>
          <div className="space-y-2">
            <Label>الوصف (إنجليزي)</Label>
            <Textarea
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={3}
              placeholder="Short description..."
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label>إظهار قسم العلامة في الفوتر</Label>
          <Switch checked={showBrand} onCheckedChange={setShowBrand} />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ العلامة'}
        </Button>
      </CardContent>
    </Card>
  )
}
