/**
 * Detailed Packages CMS Edit Page
 * Matching Studios CMS architecture with tabs and modular components
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowLeft, 
  ExternalLink, 
  Loader2, 
  Save, 
  Tag, 
  ImageIcon, 
  Sparkles, 
  Package, 
  Globe, 
  BarChart3,
  RefreshCw,
  Info
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Sub-components
import { CmsPackageBasicTab } from './_components/basic-tab'
import { CmsPackageMarketingTab } from './_components/marketing-tab'
import { CmsPackageEquipmentTab } from './_components/equipment-tab'
import { CmsPackageContentTab } from './_components/content-tab'
import { CmsPackageGalleryTab } from './_components/gallery-tab'
import { CmsPackageSeoTab } from './_components/seo-tab'
import { CmsPackageTrackingTab } from './_components/tracking-tab'

export default function PackageEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [pkg, setPkg] = useState<any>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchPackage = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/kits/${id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPkg(data)
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل الباقة', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    fetchPackage()
  }, [fetchPackage])

  const handleSave = async (payload: any) => {
    if (!id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/kits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      
      toast({ title: 'تم الحفظ ✅', description: 'تم تحديث بيانات الباقة بنجاح' })
      setDirty(false)
      fetchPackage()
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل الحفظ',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading && !pkg) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="space-y-4" dir="rtl">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/cms/packages">رجوع للمحتوى</Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            الباقة غير موجودة
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/cms/packages">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              {pkg.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              تخصيص محتوى الباقة، الصور، SEO، والمعدات
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={fetchPackage} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/packages/${pkg.slug}`} target="_blank">
              <ExternalLink className="h-4 w-4 ms-2" />
              معاينة الباقة
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start gap-1 bg-transparent h-auto p-0">
          <TabsTrigger value="basic" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">
            <Tag className="h-4 w-4 me-2" />
            أساسي
          </TabsTrigger>
          <TabsTrigger value="marketing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">
            <Sparkles className="h-4 w-4 me-2" />
            التسويق
          </TabsTrigger>
          <TabsTrigger value="equipment" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">
            <Package className="h-4 w-4 me-2" />
            المعدات
          </TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">
            <Sparkles className="h-4 w-4 me-2" />
            المحتوى
          </TabsTrigger>
          <TabsTrigger value="gallery" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">
            <ImageIcon className="h-4 w-4 me-2" />
            الصور
          </TabsTrigger>
          <TabsTrigger value="seo" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">
            <Globe className="h-4 w-4 me-2" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="tracking" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border">
            <BarChart3 className="h-4 w-4 me-2" />
            التتبع
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <CmsPackageBasicTab 
            packageData={pkg} 
            onSave={handleSave} 
            onDirtyChange={setDirty} 
            saving={saving} 
          />
        </TabsContent>

        <TabsContent value="marketing">
          <CmsPackageMarketingTab 
            cmsData={pkg.cmsData} 
            onSave={(cmsData) => handleSave({ cmsData })} 
            onDirtyChange={setDirty} 
            saving={saving} 
          />
        </TabsContent>

        <TabsContent value="equipment">
          <CmsPackageEquipmentTab 
            initialItems={pkg.items || []} 
            discountPercent={Number(pkg.discountPercent || 0)}
            onSave={(items) => handleSave({ items })} 
            onDirtyChange={setDirty} 
            saving={saving} 
          />
        </TabsContent>

        <TabsContent value="content">
          <CmsPackageContentTab 
            cmsData={pkg.cmsData} 
            onSave={(cmsData) => handleSave({ cmsData })} 
            onDirtyChange={setDirty} 
            saving={saving} 
          />
        </TabsContent>

        <TabsContent value="gallery">
          <CmsPackageGalleryTab 
            cmsData={pkg.cmsData} 
            onSave={(cmsData) => handleSave({ cmsData })} 
            onDirtyChange={setDirty} 
            saving={saving} 
          />
        </TabsContent>

        <TabsContent value="seo">
          <CmsPackageSeoTab 
            cmsData={pkg.cmsData} 
            onSave={(cmsData) => handleSave({ cmsData })} 
            onDirtyChange={setDirty} 
            saving={saving} 
          />
        </TabsContent>

        <TabsContent value="tracking">
          <CmsPackageTrackingTab 
            cmsData={pkg.cmsData} 
            onSave={(cmsData) => handleSave({ cmsData })} 
            onDirtyChange={setDirty} 
            saving={saving} 
          />
        </TabsContent>
      </Tabs>

      {/* Sticky Dirty Indicator */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 p-4 shadow-lg backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600">
              <Info className="h-5 w-5" />
              <span className="text-sm font-medium">لديك تغييرات غير محفوظة في هذا التبويب</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setDirty(false); fetchPackage(); }}>
                تجاهل التغييرات
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

