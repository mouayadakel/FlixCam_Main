/**
 * @file page.tsx
 * @description Edit equipment page with full form (tabs)
 * @module app/admin/(routes)/inventory/equipment/[id]/edit
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Loader2, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import {
  updateEquipmentSchema,
  type UpdateEquipmentFormData,
} from '@/lib/validators/equipment.validator'
import { ImageUpload } from '@/components/forms/image-upload'
import { ImageGallery } from '@/components/forms/image-gallery'
import { VideoUrlInput } from '@/components/forms/video-url-input'
import { TranslationSection } from '@/components/forms/translation-section'
import { SEOSection } from '@/components/forms/seo-section'
import { SpecificationsEditor } from '@/components/forms/specifications-editor'
import { RelatedEquipmentSelector } from '@/components/forms/related-equipment-selector'

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

export default function EditEquipmentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [equipment, setEquipment] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [activeTab, setActiveTab] = useState('info')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<UpdateEquipmentFormData>({
    resolver: zodResolver(updateEquipmentSchema),
  })

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [equipmentRes, categoriesRes, brandsRes] = await Promise.all([
        fetch(`/api/equipment/${params.id}`),
        fetch('/api/categories'),
        fetch('/api/brands'),
      ])

      if (!equipmentRes.ok) {
        throw new Error('فشل تحميل المعدة')
      }

      const equipmentData = await equipmentRes.json()
      setEquipment(equipmentData)

      // Get featured image (first image)
      const featuredImage = equipmentData.media?.find((m: any) => m.type === 'image')?.url || ''
      const galleryImages = equipmentData.media?.filter((m: any, i: number) => m.type === 'image' && i > 0).map((m: any) => m.url) || []
      const video = equipmentData.media?.find((m: any) => m.type === 'video')?.url || ''

      // Format translations from the translations object
      const translations: Array<{
        locale: 'ar' | 'en' | 'zh'
        name?: string
        description?: string
        shortDescription?: string
        seoTitle?: string
        seoDescription?: string
        seoKeywords?: string
      }> = []

      if (equipmentData.translations) {
        const locales = ['ar', 'en', 'zh'] as const
        locales.forEach((locale) => {
          const trans = equipmentData.translations[locale]
          if (trans && (trans.name || trans.description || trans.shortDescription)) {
            translations.push({
              locale,
              name: trans.name || '',
              description: trans.description || '',
              shortDescription: trans.shortDescription || '',
              seoTitle: trans.seoTitle || '',
              seoDescription: trans.seoDescription || '',
              seoKeywords: trans.seoKeywords || '',
            })
          }
        })
      }

      // Ensure at least Arabic translation exists
      if (translations.length === 0) {
        translations.push({
          locale: 'ar',
          name: '',
          description: '',
          shortDescription: '',
        })
      }

      // Reset form with equipment data
      reset({
        id: equipmentData.id,
        sku: equipmentData.sku,
        model: equipmentData.model || undefined,
        categoryId: equipmentData.categoryId,
        brandId: equipmentData.brandId || undefined,
        condition: equipmentData.condition,
        quantityTotal: equipmentData.quantityTotal,
        quantityAvailable: equipmentData.quantityAvailable,
        dailyPrice: Number(equipmentData.dailyPrice),
        weeklyPrice: equipmentData.weeklyPrice ? Number(equipmentData.weeklyPrice) : undefined,
        monthlyPrice: equipmentData.monthlyPrice ? Number(equipmentData.monthlyPrice) : undefined,
        featured: equipmentData.featured,
        isActive: equipmentData.isActive,
        warehouseLocation: equipmentData.warehouseLocation || undefined,
        barcode: equipmentData.barcode || undefined,
        specifications: (equipmentData.specifications as Record<string, unknown>) || undefined,
        featuredImageUrl: featuredImage,
        galleryImageUrls: galleryImages,
        videoUrl: video,
        translations: translations.length > 0 ? translations : undefined,
        relatedEquipmentIds: equipmentData.relatedEquipmentIds || [],
        boxContents: equipmentData.boxContents || undefined,
        bufferTime: equipmentData.bufferTime || undefined,
        bufferTimeUnit: (equipmentData.bufferTimeUnit as 'hours' | 'days') || 'hours',
      })

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData.categories ?? categoriesData)
      }

      if (brandsRes.ok) {
        const brandsData = await brandsRes.json()
        setBrands(brandsData)
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل البيانات',
        variant: 'destructive',
      })
      router.push('/admin/inventory/equipment')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: UpdateEquipmentFormData) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/equipment/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل تحديث المعدة')
      }

      toast({
        title: 'نجح',
        description: 'تم تحديث المعدة بنجاح',
      })

      router.push(`/admin/inventory/equipment/${params.id}`)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحديث المعدة',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const watchedTranslations = watch('translations') || []
  const watchedSpecifications = watch('specifications')
  const watchedCategoryId = watch('categoryId')
  const categoryHint = watchedCategoryId
    ? categories.find((c) => c.id === watchedCategoryId)?.name
    : undefined

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" dir="rtl">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-neutral-600">المعدة غير موجودة</p>
            <Button asChild className="mt-4">
              <Link href="/admin/inventory/equipment">العودة إلى قائمة المعدات</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">تعديل المعدة</h1>
          <p className="mt-1 text-sm text-neutral-600">تعديل معلومات المعدة: {equipment.sku}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={submitting}>
            {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            <Save className="ml-2 h-4 w-4" />
            حفظ التغييرات
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="info">المعلومات الأساسية</TabsTrigger>
            <TabsTrigger value="translations">الترجمات</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="media">الوسائط</TabsTrigger>
            <TabsTrigger value="specifications">المواصفات</TabsTrigger>
            <TabsTrigger value="related">ذات الصلة</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          </TabsList>

          {/* Tab 1: Basic Info */}
          <TabsContent value="info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>المعلومات الأساسية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      {...register('sku')}
                      placeholder="EQ-001"
                      dir="ltr"
                    />
                    {errors.sku && (
                      <p className="text-sm text-error-600">{errors.sku.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">الموديل</Label>
                    <Input
                      id="model"
                      {...register('model')}
                      placeholder="Sony FX3"
                    />
                    {errors.model && (
                      <p className="text-sm text-error-600">{errors.model.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoryId">الفئة *</Label>
                    <Select
                      defaultValue={equipment.categoryId}
                      onValueChange={(value) => setValue('categoryId', value)}
                    >
                      <SelectTrigger id="categoryId">
                        <SelectValue placeholder="اختر الفئة" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && (
                      <p className="text-sm text-error-600">{errors.categoryId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brandId">العلامة التجارية</Label>
                    <Select
                      defaultValue={equipment.brandId || undefined}
                      onValueChange={(value) => setValue('brandId', value)}
                    >
                      <SelectTrigger id="brandId">
                        <SelectValue placeholder="اختر العلامة التجارية" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">الحالة</Label>
                    <Select
                      defaultValue={equipment.condition}
                      onValueChange={(value) => setValue('condition', value as any)}
                    >
                      <SelectTrigger id="condition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXCELLENT">ممتاز</SelectItem>
                        <SelectItem value="GOOD">جيد</SelectItem>
                        <SelectItem value="FAIR">مقبول</SelectItem>
                        <SelectItem value="POOR">ضعيف</SelectItem>
                        <SelectItem value="MAINTENANCE">صيانة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="barcode">الباركود</Label>
                    <Input
                      id="barcode"
                      {...register('barcode')}
                      placeholder="1234567890"
                      dir="ltr"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>المخزون</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="quantityTotal">الكمية الإجمالية</Label>
                    <Input
                      id="quantityTotal"
                      type="number"
                      min="1"
                      {...register('quantityTotal', { valueAsNumber: true })}
                    />
                    {errors.quantityTotal && (
                      <p className="text-sm text-error-600">{errors.quantityTotal.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantityAvailable">الكمية المتاحة</Label>
                    <Input
                      id="quantityAvailable"
                      type="number"
                      min="0"
                      {...register('quantityAvailable', { valueAsNumber: true })}
                    />
                    {errors.quantityAvailable && (
                      <p className="text-sm text-error-600">{errors.quantityAvailable.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warehouseLocation">موقع المستودع</Label>
                    <Input
                      id="warehouseLocation"
                      {...register('warehouseLocation')}
                      placeholder="رف A-3"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>التسعير</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="dailyPrice">السعر اليومي *</Label>
                    <Input
                      id="dailyPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      {...register('dailyPrice', { valueAsNumber: true })}
                      placeholder="0.00"
                      dir="ltr"
                    />
                    {errors.dailyPrice && (
                      <p className="text-sm text-error-600">{errors.dailyPrice.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weeklyPrice">السعر الأسبوعي</Label>
                    <Input
                      id="weeklyPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      {...register('weeklyPrice', { valueAsNumber: true })}
                      placeholder="0.00"
                      dir="ltr"
                    />
                    {errors.weeklyPrice && (
                      <p className="text-sm text-error-600">{errors.weeklyPrice.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlyPrice">السعر الشهري</Label>
                    <Input
                      id="monthlyPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      {...register('monthlyPrice', { valueAsNumber: true })}
                      placeholder="0.00"
                      dir="ltr"
                    />
                    {errors.monthlyPrice && (
                      <p className="text-sm text-error-600">{errors.monthlyPrice.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الإعدادات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      {...register('isActive')}
                      defaultChecked={equipment.isActive}
                      className="h-4 w-4 rounded border-neutral-300"
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">
                      نشط
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="featured"
                      {...register('featured')}
                      defaultChecked={equipment.featured}
                      className="h-4 w-4 rounded border-neutral-300"
                    />
                    <Label htmlFor="featured" className="cursor-pointer">
                      مميز
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Translations */}
          <TabsContent value="translations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>الترجمات</CardTitle>
                <p className="text-sm text-neutral-600 mt-2">
                  أدخل معلومات المعدة بلغات متعددة. العربية مطلوبة كحد أدنى.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {(['ar', 'en', 'zh'] as const).map((locale) => {
                  const translation = watchedTranslations.find((t) => t.locale === locale) || {
                    locale,
                    name: '',
                    description: '',
                    shortDescription: '',
                  }

                  return (
                    <TranslationSection
                      key={locale}
                      locale={locale}
                      value={translation}
                      onChange={(newValue) => {
                        const current = watchedTranslations || []
                        const index = current.findIndex((t) => t.locale === locale)
                        if (index >= 0) {
                          const updated = [...current]
                          updated[index] = { ...updated[index], ...newValue }
                          setValue('translations', updated)
                        } else {
                          setValue('translations', [...current, { locale, name: newValue.name ?? '', ...newValue }])
                        }
                      }}
                      defaultExpanded={locale === 'ar'}
                    />
                  )
                })}
                {errors.translations && (
                  <p className="text-sm text-error-600">{errors.translations.message}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: SEO */}
          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SEO (تحسين محركات البحث)</CardTitle>
                <p className="text-sm text-neutral-600 mt-2">
                  أدخل معلومات SEO لكل لغة لتحسين ظهور المعدة في نتائج البحث.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {(['ar', 'en', 'zh'] as const).map((locale) => {
                  const translation = watchedTranslations.find((t) => t.locale === locale) || {
                    locale,
                    seoTitle: '',
                    seoDescription: '',
                    seoKeywords: '',
                  }

                  return (
                    <SEOSection
                      key={locale}
                      locale={locale}
                      value={{
                        seoTitle: translation.seoTitle,
                        seoDescription: translation.seoDescription,
                        seoKeywords: translation.seoKeywords,
                      }}
                      onChange={(newValue) => {
                        const current = watchedTranslations || []
                        const index = current.findIndex((t) => t.locale === locale)
                        if (index >= 0) {
                          const updated = [...current]
                          updated[index] = { ...updated[index], ...newValue }
                          setValue('translations', updated)
                        } else {
                          setValue('translations', [...current, { name: ('name' in translation ? translation.name : '') ?? '', ...translation, ...newValue }])
                        }
                      }}
                      name={'name' in translation ? translation.name : ''}
                      shortDescription={'shortDescription' in translation ? translation.shortDescription : ''}
                      defaultExpanded={locale === 'ar'}
                    />
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Media */}
          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>الوسائط</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ImageUpload
                  value={watch('featuredImageUrl')}
                  onChange={(url) => setValue('featuredImageUrl', url)}
                  label="الصورة المميزة"
                  equipmentId={params.id}
                />

                <ImageGallery
                  value={watch('galleryImageUrls') || []}
                  onChange={(urls) => setValue('galleryImageUrls', urls)}
                  label="معرض الصور"
                  equipmentId={params.id}
                />

                <VideoUrlInput
                  value={watch('videoUrl')}
                  onChange={(url) => setValue('videoUrl', url)}
                  label="رابط الفيديو"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Specifications */}
          <TabsContent value="specifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>المواصفات</CardTitle>
                <p className="text-sm text-neutral-600 mt-2">
                  أدخل مواصفات المعدة باستخدام أي من الطرق المتاحة.
                </p>
              </CardHeader>
              <CardContent>
                <SpecificationsEditor
                  value={watchedSpecifications as Record<string, unknown>}
                  onChange={(specs) => setValue('specifications', specs)}
                  categoryHint={categoryHint}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Related Equipment */}
          <TabsContent value="related" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>المعدات ذات الصلة</CardTitle>
                <p className="text-sm text-neutral-600 mt-2">
                  اختر المعدات المرتبطة بهذه المعدة (معدات موصى بها).
                </p>
              </CardHeader>
              <CardContent>
                <RelatedEquipmentSelector
                  value={watch('relatedEquipmentIds') || []}
                  onChange={(ids) => setValue('relatedEquipmentIds', ids)}
                  excludeId={params.id}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 7: Settings */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>الإعدادات الإضافية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="boxContents">محتوى الصندوق</Label>
                  <Textarea
                    id="boxContents"
                    {...register('boxContents')}
                    placeholder="قائمة بمحتويات الصندوق أو الكيت..."
                    rows={6}
                    dir="rtl"
                  />
                  <p className="text-xs text-neutral-500">
                    يمكنك إدخال نص عادي أو HTML. سيتم اكتشاف التنسيق تلقائياً.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bufferTime">وقت الفاصل</Label>
                    <Input
                      id="bufferTime"
                      type="number"
                      min="0"
                      {...register('bufferTime', { valueAsNumber: true })}
                      placeholder="0"
                    />
                    {errors.bufferTime && (
                      <p className="text-sm text-error-600">{errors.bufferTime.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bufferTimeUnit">وحدة الوقت</Label>
                    <Select
                      defaultValue={equipment.bufferTimeUnit || 'hours'}
                      onValueChange={(value) => setValue('bufferTimeUnit', value as 'hours' | 'days')}
                    >
                      <SelectTrigger id="bufferTimeUnit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">ساعات</SelectItem>
                        <SelectItem value="days">أيام</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            إلغاء
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            حفظ التغييرات
            <ArrowRight className="mr-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
