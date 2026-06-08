/**
 * Basic tab for Package CMS: name, description, slug, active status, discount
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
import { Loader2 } from 'lucide-react'

interface BasicTabProps {
  packageData: any
  onSave: (data: any) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsPackageBasicTab({ packageData, onSave, onDirtyChange, saving }: BasicTabProps) {
  const [form, setForm] = useState({
    name: '',
    nameEn: '',
    nameZh: '',
    description: '',
    descriptionEn: '',
    descriptionZh: '',
    slug: '',
    discountPercent: 0,
    isActive: true,
  })

  useEffect(() => {
    if (packageData) {
      setForm({
        name: packageData.name ?? '',
        nameEn: packageData.nameEn ?? '',
        nameZh: packageData.nameZh ?? '',
        description: packageData.description ?? '',
        descriptionEn: packageData.descriptionEn ?? '',
        descriptionZh: packageData.descriptionZh ?? '',
        slug: packageData.slug ?? '',
        discountPercent: packageData.discountPercent != null ? Number(packageData.discountPercent) : 0,
        isActive: packageData.isActive !== false,
      })
    }
  }, [packageData])

  const handleChange = (key: string, value: any) => {
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
      slug: form.slug.trim(),
      discountPercent: form.discountPercent,
      isActive: form.isActive,
    })
    onDirtyChange(false)
  }

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle>بيانات أساسية</CardTitle>
        <CardDescription>الاسم، الوصف، الرابط، والحالة العامة للباقة</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slug">الرابط (slug) *</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                required
                placeholder="مثال: professional-cinema-kit"
              />
              <p className="text-xs text-muted-foreground">تغيير الرابط قد يؤثر على محركات البحث</p>
            </div>
            <div className="space-y-2 text-start" dir="ltr">
              <Label htmlFor="discountPercent">نسبة الخصم (%)</Label>
              <Input
                id="discountPercent"
                type="number"
                min={0}
                max={100}
                value={form.discountPercent}
                onChange={(e) => handleChange('discountPercent', Number(e.target.value))}
              />
            </div>
          </div>

          <Tabs defaultValue="ar" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ar">العربية</TabsTrigger>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="zh">中文</TabsTrigger>
            </TabsList>

            <TabsContent value="ar" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الباقة بالقرعبي *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">الوصف العربي</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={4}
                  dir="rtl"
                />
              </div>
            </TabsContent>

            <TabsContent value="en" className="mt-4 space-y-4 text-start" dir="ltr">
              <div className="space-y-2">
                <Label htmlFor="nameEn">Package Name (English)</Label>
                <Input
                  id="nameEn"
                  value={form.nameEn}
                  onChange={(e) => handleChange('nameEn', e.target.value)}
                  placeholder="e.g. Cinema Production Kit"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionEn">English Description</Label>
                <Textarea
                  id="descriptionEn"
                  value={form.descriptionEn}
                  onChange={(e) => handleChange('descriptionEn', e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="zh" className="mt-4 space-y-4 text-start" dir="ltr">
              <div className="space-y-2">
                <Label htmlFor="nameZh">名称 (中文)</Label>
                <Input
                  id="nameZh"
                  value={form.nameZh}
                  onChange={(e) => handleChange('nameZh', e.target.value)}
                  placeholder="例如：电影制作套餐"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionZh">描述 (中文)</Label>
                <Textarea
                  id="descriptionZh"
                  value={form.descriptionZh}
                  onChange={(e) => handleChange('descriptionZh', e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={form.isActive}
              onCheckedChange={(v) => handleChange('isActive', v)}
            />
            <Label htmlFor="isActive">باقة نشطة (تظهر في الموقع)</Label>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : null}
            حفظ البيانات الأساسية
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
