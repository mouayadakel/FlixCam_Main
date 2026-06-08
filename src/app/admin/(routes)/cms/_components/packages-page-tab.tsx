'use client'

import { useState, useEffect } from 'react'
import { 
  Save, 
  Loader2, 
  Layout, 
  Search, 
  ImageIcon, 
  CheckCircle2, 
  Star,
  ExternalLink
} from 'lucide-react'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'

export function CmsPackagesPageTab() {
  const [settings, setSettings] = useState<any[]>([])
  const [kits, setKits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [settingsRes, kitsRes] = await Promise.all([
        fetch('/api/admin/marketing/settings'),
        fetch('/api/kits') // Fetch basic kits for selection
      ])
      
      const settingsData = await settingsRes.json()
      const kitsData = await kitsRes.json()
      
      setSettings(settingsData.settings || [])
      setKits(kitsData.kits || [])
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل تحميل البيانات', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateValue = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const packageKeys = [
        'packages_seo_title_ar',
        'packages_seo_title_en',
        'packages_seo_description_ar',
        'packages_seo_description_en',
        'packages_featured_ids'
      ]
      
      const relevantSettings = settings.filter(s => packageKeys.includes(s.key))
      
      await fetch('/api/admin/marketing/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: relevantSettings.map(s => ({ key: s.key, value: s.value })) })
      })

      toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات صفحة الباقات بنجاح' })
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل حفظ الإعدادات', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const getVal = (key: string) => settings.find(s => s.key === key)?.value || ''

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* ─── HERO SECTION CONTROL ─── */}
      <Card className="border-primary/10 shadow-sm overflow-hidden border-t-4 border-t-primary">
        <CardHeader className="bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                البانر الرئيسي (Hero)
              </CardTitle>
              <CardDescription>
                يتم إدارة الصور المتحركة والنصوص للقسم العلوي عبر نظام البانرات الرئيسي
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/settings/hero-banners">
                <ExternalLink className="h-4 w-4 me-2" />
                إدارة البانرات
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-xl bg-muted/30 p-4 border border-dashed border-primary/20 text-sm text-muted-foreground flex items-start gap-3">
             <Layout className="h-5 w-5 text-primary shrink-0" />
             <div>
               <p className="font-bold text-foreground mb-1">نصيحة للمسؤول:</p>
               <p>لعرض بانر مخصص في صفحة الباقات، قم بإنشاء بانر جديد أو تعديل بانر موجود واضبط "Slug الصفحة" على القيمة: <code className="bg-primary/10 px-1 rounded font-mono text-primary">packages</code></p>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── SEO SETTINGS ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            إعدادات SEO (محركات البحث)
          </CardTitle>
          <CardDescription>تحكم في كيفية ظهور صفحة الباقات في نتائج بحث جوجل وشبكات التواصل</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>عنوان الصفحة (AR)</Label>
              <Input 
                value={getVal('packages_seo_title_ar')} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateValue('packages_seo_title_ar', e.target.value)} 
                placeholder="مثلاً: باقات تأجير المعدات السينمائية"
              />
            </div>
            <div className="space-y-2">
              <Label>Page Title (EN)</Label>
              <Input 
                value={getVal('packages_seo_title_en')} 
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateValue('packages_seo_title_en', e.target.value)} 
                dir="ltr"
                placeholder="e.g. Professional Cinema Equipment Packages"
              />
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>وصف الصفحة (AR)</Label>
              <Textarea 
                value={getVal('packages_seo_description_ar')} 
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleUpdateValue('packages_seo_description_ar', e.target.value)} 
                placeholder="وصف مختصر يظهر في نتائج البحث..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Page Description (EN)</Label>
              <Textarea 
                value={getVal('packages_seo_description_en')} 
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleUpdateValue('packages_seo_description_en', e.target.value)} 
                dir="ltr"
                placeholder="Short description for search engines..."
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── FEATURED PACKAGES ─── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            الباقات المميزة (Featured)
          </CardTitle>
          <CardDescription>اختر الباقات التي تظهر بأولوية قصوى في أعلى قائمة الباقات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>معرفات الباقات (مفصولة بفاصلة)</Label>
            <Input 
              value={getVal('packages_featured_ids')} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateValue('packages_featured_ids', e.target.value)} 
              placeholder="id1, id2, id3"
              dir="ltr"
            />
            <p className="text-[10px] text-muted-foreground italic">يمكنك العثور على المعرف (ID) بجانب اسم الباقة في صفحة إدارة الباقات.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving} size="lg" className="px-12 rounded-xl">
          {saving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
          حفظ جميع إعدادات الصفحة
        </Button>
      </div>
    </div>
  )
}
