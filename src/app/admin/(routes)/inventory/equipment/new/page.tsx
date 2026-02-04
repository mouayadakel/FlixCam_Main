/**
 * @file page.tsx
 * @description Create new equipment page with full form (tabs)
 * @module app/admin/(routes)/inventory/equipment/new
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
import {
  createEquipmentSchema,
  type CreateEquipmentFormData,
  type EquipmentTranslationFormData,
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

export default function NewEquipmentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [activeTab, setActiveTab] = useState('info')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateEquipmentFormData>({
    resolver: zodResolver(createEquipmentSchema),
    defaultValues: {
      condition: 'GOOD',
      quantityTotal: 1,
      quantityAvailable: 1,
      isActive: true,
      featured: false,
      translations: [
        { locale: 'ar', name: '' },
      ],
      galleryImageUrls: [],
      relatedEquipmentIds: [],
      bufferTimeUnit: 'hours',
    },
  })


  useEffect(() => {
    loadLookups()
  }, [])

  const loadLookups = async () => {
    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/brands'),
      ])

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(categoriesData.categories ?? categoriesData)
      }

      if (brandsRes.ok) {
        const brandsData = await brandsRes.json()
        setBrands(brandsData)
      }
    } catch (error) {
      console.error('Failed to load lookups:', error)
      toast({
        title: 'تحذير',
        description: 'فشل تحميل الفئات والعلامات التجارية',
        variant: 'destructive',
      })
    }
  }

  const watchedTranslations = watch('translations') || []
  const watchedSpecifications = watch('specifications')

  const onSubmit = async (data: CreateEquipmentFormData) => {
    setLoading(true)
    try {
      // Filter out empty translations and ensure at least one
      const validTranslations = (data.translations || []).filter(
        (t) => t.name && t.name.trim().length > 0
      )

      if (validTranslations.length === 0) {
        toast({
          title: 'خطأ',
          description: 'يجب إدخال ترجمة واحدة على الأقل (العربية مفضلة)',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      // Separate data URLs (temporary file uploads) from regular URLs
      const featuredImageDataUrl = data.featuredImageUrl?.startsWith('blob:') || data.featuredImageUrl?.startsWith('data:') 
        ? data.featuredImageUrl 
        : null
      const galleryImageDataUrls = data.galleryImageUrls?.filter((url) => 
        url.startsWith('blob:') || url.startsWith('data:')
      ) || []
      
      // Prepare payload - exclude data URLs for now
      const payload = {
        ...data,
        translations: validTranslations,
        featuredImageUrl: featuredImageDataUrl ? undefined : data.featuredImageUrl,
        galleryImageUrls: data.galleryImageUrls?.filter((url) => 
          !url.startsWith('blob:') && !url.startsWith('data:')
        ),
        videoUrl: data.videoUrl?.startsWith('blob:') || data.videoUrl?.startsWith('data:') 
          ? undefined 
          : data.videoUrl,
      }

      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل إنشاء المعدة')
      }

      const equipment = await response.json()

      // Upload files if there are any data URLs (for new equipment)
      // Note: This is a fallback - users should use URLs for new equipment
      // But if they selected files, we'll try to convert and upload them
      if (featuredImageDataUrl || galleryImageDataUrls.length > 0) {
        toast({
          title: 'تنبيه',
          description: 'تم إنشاء المعدة. يُفضل استخدام روابط URLs للصور. يمكنك رفع الملفات من صفحة التعديل.',
          variant: 'default',
        })
      } else {
        toast({
          title: 'نجح',
          description: 'تم إنشاء المعدة بنجاح',
        })
      }

      router.push(`/admin/inventory/equipment/${equipment.id}`)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إنشاء المعدة',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Ensure at least Arabic translation exists
  useEffect(() => {
    const translations = watch('translations') || []
    const hasArabic = translations.some((t) => t.locale === 'ar')
    if (!hasArabic && translations.length === 0) {
      setValue('translations', [{ locale: 'ar', name: '' }])
    }
  }, [watch, setValue])

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">إضافة معدات جديدة</h1>
          <p className="mt-1 text-sm text-neutral-600">إنشاء معدات جديدة في النظام</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={loading}>
            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            <Save className="ml-2 h-4 w-4" />
            حفظ المعدة
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
                    {errors.brandId && (
                      <p className="text-sm text-error-600">{errors.brandId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">الحالة</Label>
                    <Select
                      defaultValue="GOOD"
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
                />

                <ImageGallery
                  value={watch('galleryImageUrls') || []}
                  onChange={(urls) => setValue('galleryImageUrls', urls)}
                  label="معرض الصور"
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
                      defaultValue="hours"
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
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            حفظ المعدة
            <ArrowRight className="mr-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
