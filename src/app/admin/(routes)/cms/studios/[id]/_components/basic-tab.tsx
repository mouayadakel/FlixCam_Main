/**
 * Basic tab: name, description, area, type, best use, availability, SEO
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface BasicTabProps {
  studio: Record<string, unknown>
  onSave: (data: Record<string, unknown>) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsStudioBasicTab({ studio, onSave, onDirtyChange, saving }: BasicTabProps) {
  const [form, setForm] = useState({
    name: '',
    nameEn: '',
    nameZh: '',
    description: '',
    descriptionEn: '',
    descriptionZh: '',
    capacity: '',
    heroTagline: '',
    heroTaglineEn: '',
    heroTaglineZh: '',
    areaSqm: '',
    studioType: '',
    bestUse: '',
    availabilityConfidence: '',
    isActive: true,
    metaTitle: '',
    metaDescription: '',
  })

  useEffect(() => {
    setForm({
      name: (studio.name as string) ?? '',
      nameEn: (studio.nameEn as string) ?? '',
      nameZh: (studio.nameZh as string) ?? '',
      description: (studio.description as string) ?? '',
      descriptionEn: (studio.descriptionEn as string) ?? '',
      descriptionZh: (studio.descriptionZh as string) ?? '',
      capacity: studio.capacity != null ? String(studio.capacity) : '',
      heroTagline: (studio.heroTagline as string) ?? '',
      heroTaglineEn: (studio.heroTaglineEn as string) ?? '',
      heroTaglineZh: (studio.heroTaglineZh as string) ?? '',
      areaSqm: studio.areaSqm != null ? String(studio.areaSqm) : '',
      studioType: (studio.studioType as string) ?? '',
      bestUse: (studio.bestUse as string) ?? '',
      availabilityConfidence: (studio.availabilityConfidence as string) ?? '',
      isActive: (studio.isActive as boolean) ?? true,
      metaTitle: (studio.metaTitle as string) ?? '',
      metaDescription: (studio.metaDescription as string) ?? '',
    })
  }, [studio])

  const handleChange = (key: string, value: string | number | boolean) => {
    setForm((f) => ({ ...f, [key]: value }))
    onDirtyChange(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      name: form.name.trim(),
      nameEn: form.nameEn.trim() || null,
      nameZh: form.nameZh.trim() || null,
      description: form.description.trim() || null,
      descriptionEn: form.descriptionEn.trim() || null,
      descriptionZh: form.descriptionZh.trim() || null,
      capacity: form.capacity ? parseInt(form.capacity, 10) : null,
      heroTagline: form.heroTagline.trim() || null,
      heroTaglineEn: form.heroTaglineEn.trim() || null,
      heroTaglineZh: form.heroTaglineZh.trim() || null,
      areaSqm: form.areaSqm ? parseInt(form.areaSqm, 10) : null,
      studioType: form.studioType.trim() || null,
      bestUse: form.bestUse.trim() || null,
      availabilityConfidence: form.availabilityConfidence || null,
      isActive: form.isActive,
      metaTitle: form.metaTitle.trim() || null,
      metaDescription: form.metaDescription.trim() || null,
    })
    onDirtyChange(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>أساسي</CardTitle>
        <CardDescription>الاسم، الوصف، النوع، حالة التوفر، SEO</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>الرابط (slug)</Label>
            <Input value={(studio.slug as string) ?? ''} readOnly disabled className="bg-muted" />
          </div>

          <Tabs defaultValue="ar" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ar">العربية</TabsTrigger>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="zh">中文</TabsTrigger>
            </TabsList>

            <TabsContent value="ar" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  maxLength={120}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={4}
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroTagline">شعار الصفحة (Tagline)</Label>
                <Input
                  id="heroTagline"
                  value={form.heroTagline}
                  onChange={(e) => handleChange('heroTagline', e.target.value)}
                  placeholder="استوديو واحد — باقات تناسب كل مشروع"
                  dir="rtl"
                />
              </div>
            </TabsContent>

            <TabsContent value="en" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nameEn">Name (English)</Label>
                <Input
                  id="nameEn"
                  value={form.nameEn}
                  onChange={(e) => handleChange('nameEn', e.target.value)}
                  maxLength={120}
                  placeholder="Studio name in English"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionEn">Description (English)</Label>
                <Textarea
                  id="descriptionEn"
                  value={form.descriptionEn}
                  onChange={(e) => handleChange('descriptionEn', e.target.value)}
                  rows={4}
                  placeholder="Studio description in English"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroTaglineEn">Tagline (English)</Label>
                <Input
                  id="heroTaglineEn"
                  value={form.heroTaglineEn}
                  onChange={(e) => handleChange('heroTaglineEn', e.target.value)}
                  placeholder="One studio — packages for every project"
                />
              </div>
            </TabsContent>

            <TabsContent value="zh" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nameZh">名称 (中文)</Label>
                <Input
                  id="nameZh"
                  value={form.nameZh}
                  onChange={(e) => handleChange('nameZh', e.target.value)}
                  maxLength={120}
                  placeholder="工作室中文名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionZh">描述 (中文)</Label>
                <Textarea
                  id="descriptionZh"
                  value={form.descriptionZh}
                  onChange={(e) => handleChange('descriptionZh', e.target.value)}
                  rows={4}
                  placeholder="工作室中文描述"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroTaglineZh">标语 (中文)</Label>
                <Input
                  id="heroTaglineZh"
                  value={form.heroTaglineZh}
                  onChange={(e) => handleChange('heroTaglineZh', e.target.value)}
                  placeholder="一个工作室 — 适合每个项目的套餐"
                />
              </div>
            </TabsContent>
          </Tabs>
          <div className="space-y-2">
            <Label htmlFor="capacity">السعة (أشخاص)</Label>
            <Input
              id="capacity"
              type="number"
              min={0}
              value={form.capacity}
              onChange={(e) => handleChange('capacity', e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="areaSqm">المساحة (م²)</Label>
              <Input
                id="areaSqm"
                type="number"
                min={0}
                value={form.areaSqm}
                onChange={(e) => handleChange('areaSqm', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studioType">النوع</Label>
              <Input
                id="studioType"
                value={form.studioType}
                onChange={(e) => handleChange('studioType', e.target.value)}
                placeholder="مثال: تصوير، بودكاست"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bestUse">أفضل استخدام</Label>
              <Input
                id="bestUse"
                value={form.bestUse}
                onChange={(e) => handleChange('bestUse', e.target.value)}
                dir="rtl"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>حالة التوفر</Label>
            <Select
              value={form.availabilityConfidence || 'none'}
              onValueChange={(v) => handleChange('availabilityConfidence', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="available_now">متاح اليوم</SelectItem>
                <SelectItem value="requires_review">يتطلب تأكيد</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={form.isActive}
              onCheckedChange={(v) => handleChange('isActive', v)}
            />
            <Label htmlFor="isActive">نشط</Label>
          </div>
          <div className="border-t pt-4">
            <h4 className="mb-2 font-medium">SEO</h4>
            <div className="space-y-2">
              <Label htmlFor="metaTitle">عنوان الصفحة (meta)</Label>
              <Input
                id="metaTitle"
                value={form.metaTitle}
                onChange={(e) => handleChange('metaTitle', e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="mt-2 space-y-2">
              <Label htmlFor="metaDescription">وصف الصفحة (meta)</Label>
              <Textarea
                id="metaDescription"
                value={form.metaDescription}
                onChange={(e) => handleChange('metaDescription', e.target.value)}
                rows={2}
                dir="rtl"
              />
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span className="mr-2">حفظ</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
