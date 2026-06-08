/**
 * SEO tab: Meta title, description, keywords, OG image, canonical
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Globe, Share2, Link2, Loader2, Info } from 'lucide-react'

interface SeoTabProps {
  cmsData: any
  onSave: (data: any) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsPackageSeoTab({ cmsData, onSave, onDirtyChange, saving }: SeoTabProps) {
  const [form, setForm] = useState({
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    canonicalUrl: '',
    ogImageUrl: '',
  })

  useEffect(() => {
    if (cmsData) {
      setForm({
        seoTitle: cmsData.seoTitle ?? '',
        seoDescription: cmsData.seoDescription ?? '',
        seoKeywords: cmsData.seoKeywords ?? '',
        canonicalUrl: cmsData.canonicalUrl ?? '',
        ogImageUrl: cmsData.ogImageUrl ?? '',
      })
    }
  }, [cmsData])

  const handleChange = (patch: any) => {
    setForm((f) => ({ ...f, ...patch }))
    onDirtyChange(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      ...cmsData,
      ...form,
    })
    onDirtyChange(false)
  }

  return (
    <Card dir="rtl" className="overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10">
        <CardTitle>تحسين محركات البحث (SEO)</CardTitle>
        <CardDescription>إدارة كيفية ظهور الباقة في نتائج بحث جوجل ومنصات التواصل</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        
        {/* Dynamic Google SERP Preview Box */}
        <div className="mb-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-900">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">مظهر محرك البحث جوجل (Google SERP Preview)</span>
            <span className="text-[10px] text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded font-bold">معاينة مباشرة / Live</span>
          </div>
          
          <div className="space-y-1 font-sans text-start select-none" dir="ltr">
            {/* SERP Url Breadcrumbs */}
            <p className="text-xs text-slate-500 truncate flex items-center gap-1">
              <span>https://flixcam.rent</span>
              <span className="text-slate-400">›</span>
              <span className="text-slate-650">packages</span>
              <span className="text-slate-400">›</span>
              <span className="text-emerald-600 font-medium truncate">{cmsData?.slug || 'kit-package'}</span>
            </p>
            {/* SERP Title */}
            <p className="text-lg font-medium text-blue-800 dark:text-blue-400 hover:underline leading-tight cursor-pointer">
              {form.seoTitle.trim() || 'باقة التصوير السينمائي المتكاملة | فليكس كام'}
            </p>
            {/* SERP Description */}
            <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-normal max-w-[600px]">
              {form.seoDescription.trim() || 'شاهد تفاصيل ومكونات باقة التصوير الاحترافية من فليكس كام. معدات سينمائية ومكملات إضاءة بأفضل أسعار الإيجار اليومي.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Globe className="h-5 w-5" />
              <span>علامات الميتا (Meta Tags)</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="seoTitle" className="font-semibold text-slate-700 dark:text-slate-300">
                  عنوان الصفحة (SEO Title)
                </Label>
                <span className={`text-xs font-bold ${form.seoTitle.length > 60 ? 'text-amber-500' : 'text-slate-400'}`}>
                  {form.seoTitle.length} / 60 حرف {form.seoTitle.length > 60 && '⚠️ (تجاوز الطول المفضل)'}
                </span>
              </div>
              <Input
                id="seoTitle"
                value={form.seoTitle}
                onChange={(e) => handleChange({ seoTitle: e.target.value })}
                placeholder="مثال: باقة التصوير السينمائي المتكاملة | فليكس كام"
                maxLength={70}
                className="focus-visible:ring-emerald-600"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="seoDescription" className="font-semibold text-slate-700 dark:text-slate-300">
                  وصف الصفحة (Meta Description)
                </Label>
                <span className={`text-xs font-bold ${form.seoDescription.length > 160 ? 'text-amber-500' : 'text-slate-400'}`}>
                  {form.seoDescription.length} / 160 حرف {form.seoDescription.length > 160 && '⚠️ (تجاوز الطول المفضل)'}
                </span>
              </div>
              <Textarea
                id="seoDescription"
                value={form.seoDescription}
                onChange={(e) => handleChange({ seoDescription: e.target.value })}
                placeholder="قدم وصفاً مختصراً وجذاباً لمحتوى الباقة يظهر في نتائج البحث..."
                rows={3}
                maxLength={180}
                className="focus-visible:ring-emerald-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoKeywords">الكلمات المفتاحية (Keywords)</Label>
              <Input
                id="seoKeywords"
                value={form.seoKeywords}
                onChange={(e) => handleChange({ seoKeywords: e.target.value })}
                placeholder="مثال: تصوير إعلاني، معدات سينمائية، تأجير كاميرات"
              />
              <p className="text-xs text-muted-foreground">افصل بين الكلمات بفاصلة (,)</p>
            </div>
          </div>

          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Share2 className="h-5 w-5" />
              <span>مشاركة التواصل الاجتماعي (OG)</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ogImageUrl">رابط صورة المشاركة (OG Image)</Label>
              <Input
                id="ogImageUrl"
                value={form.ogImageUrl}
                onChange={(e) => handleChange({ ogImageUrl: e.target.value })}
                placeholder="https://..."
                dir="ltr"
                className="text-start"
              />
              <p className="text-xs text-muted-foreground">الصورة التي تظهر عند مشاركة رابط الباقة في واتساب/تويتر/فيسبوك</p>
            </div>
          </div>

          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Link2 className="h-5 w-5" />
              <span>الإعدادات المتقدمة</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="canonicalUrl">الرابط المفضل (Canonical URL)</Label>
              <Input
                id="canonicalUrl"
                value={form.canonicalUrl}
                onChange={(e) => handleChange({ canonicalUrl: e.target.value })}
                placeholder="https://..."
                dir="ltr"
                className="text-start"
              />
              <p className="text-xs text-muted-foreground">يستخدم لتجنب المحتوى المكرر في محركات البحث</p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            <Info className="h-5 w-5 shrink-0" />
            <p>تأكد من اختيار عنوان ووصف فريد لكل باقة لتحسين ظهورها في نتائج البحث.</p>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : null}
              حفظ بيانات SEO
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
