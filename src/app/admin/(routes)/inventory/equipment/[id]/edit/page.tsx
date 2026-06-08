/**
 * @file page.tsx
 * @description Edit equipment page with full form (tabs)
 * @module app/admin/(routes)/inventory/equipment/[id]/edit
 */

'use client'

import { use, useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Loader2, Save, Sparkles, Wand2, CheckCircle2, ExternalLink, Trash2, Info, ChevronDown, Check, Copy, Eye, Plus, Layout, Zap } from 'lucide-react'
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
import { SpecificationsLivePreview } from '@/components/features/equipment/specifications-live-preview'
import { RelatedEquipmentSelector } from '@/components/forms/related-equipment-selector'
import {
  AISuggestPreviewDialog,
  type AISuggestPayload,
} from '@/components/features/equipment/ai-suggest-preview-dialog'
import { FormProgressSidebar } from '@/components/features/equipment/form-progress-sidebar'
import { stringifySeoKeywords } from '@/lib/utils'
import { EMBED_LTR } from '@/lib/i18n/bidi'
import { PhotoGateIndicator } from '@/components/features/equipment/photo-gate-indicator'
import { SmartFillDropdown } from '@/components/features/equipment/smart-fill-dropdown'
import { TranslationTabSwitcher } from '@/components/features/equipment/translation-tab-switcher'
import type { FillScope } from '@/components/features/equipment/smart-fill-dropdown'
import type { TranslationData } from '@/components/features/equipment/translation-tab-switcher'
import {
  CrewEquipmentFields,
  crewProfileFromForm,
  crewProfileToForm,
  type CrewProfileFormValues,
} from '@/components/admin/equipment/crew-equipment-fields'

interface Category {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
}

const INVALID_FIELD_LABELS: Record<string, string> = {
  sku: 'SKU',
  model: 'الموديل',
  categoryId: 'الفئة',
  brandId: 'العلامة التجارية',
  condition: 'الحالة',
  quantityTotal: 'الكمية الإجمالية',
  quantityAvailable: 'الكمية المتاحة',
  dailyPrice: 'السعر اليومي',
  weeklyPrice: 'السعر الأسبوعي',
  monthlyPrice: 'السعر الشهري',
  purchasePrice: 'سعر الشراء',
  depositAmount: 'مبلغ التأمين',
  requiresDeposit: 'إلزامية التأمين',
  featuredImageUrl: 'الصورة المميزة',
  galleryImageUrls: 'معرض الصور',
  videoUrl: 'رابط الفيديو',
  translations: 'الترجمات',
  specifications: 'المواصفات',
  relatedEquipmentIds: 'المعدات ذات الصلة',
  boxContents: 'محتوى الصندوق',
  bufferTime: 'وقت الفاصل',
  bufferTimeUnit: 'وحدة الوقت',
}

const INVALID_FIELD_TAB_MAP: Record<string, string> = {
  sku: 'info',
  model: 'info',
  categoryId: 'info',
  brandId: 'info',
  condition: 'info',
  quantityTotal: 'info',
  quantityAvailable: 'info',
  dailyPrice: 'info',
  weeklyPrice: 'info',
  monthlyPrice: 'info',
  purchasePrice: 'info',
  depositAmount: 'info',
  requiresDeposit: 'info',
  featuredImageUrl: 'media',
  galleryImageUrls: 'media',
  videoUrl: 'media',
  translations: 'content',
  specifications: 'specs',
  relatedEquipmentIds: 'related',
  boxContents: 'content',
  tags: 'content',
  bufferTime: 'info',
  bufferTimeUnit: 'info',
  featured: 'info',
}

function normalizeMediaUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('uploads/')) {
    return `/${trimmed}`
  }
  if (trimmed.startsWith('www.')) {
    return `https://${trimmed}`
  }
  return trimmed
}

function isGalleryUnchanged(currentGallery: string[], originalGallery: string[]): boolean {
  return (
    currentGallery.length === originalGallery.length &&
    currentGallery.every((url, i) => url === originalGallery[i])
  )
}

function parseApiErrorPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback

  const rec = payload as Record<string, unknown>
  if (typeof rec.error === 'string' && rec.error.trim()) return rec.error

  if (rec.error && typeof rec.error === 'object') {
    const fieldErrors = rec.error as Record<string, unknown>
    const messages = Object.values(fieldErrors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => String(value).trim())
      .filter(Boolean)
    if (messages.length > 0) return messages.slice(0, 3).join(' - ')
  }

  return fallback
}

export default function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [equipment, setEquipment] = useState<any>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [activeTab, setActiveTab] = useState('info')
  const [activeLocale, setActiveLocale] = useState<'ar' | 'en' | 'zh' | 'fr'>('ar')
  const [applyScope, setApplyScope] = useState<FillScope>('all')
  const [showAISuggest, setShowAISuggest] = useState(false)
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestPayload | null>(null)
  const [autoFilling, setAutoFilling] = useState(false)
  const [aiFilled, setAiFilled] = useState(false)
  const [aiFilledCount, setAiFilledCount] = useState(0)
  const [comboMessage, setComboMessage] = useState('')
  const [comboDiscountPercent, setComboDiscountPercent] = useState(10)
  const [comboSettingsLoading, setComboSettingsLoading] = useState(false)
  const [comboSettingsSaving, setComboSettingsSaving] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const [savingMediaOnly, setSavingMediaOnly] = useState(false)

  // Track original image URLs loaded from server to avoid creating duplicate media records
  const [originalFeaturedImageUrl, setOriginalFeaturedImageUrl] = useState('')
  const [originalGalleryImageUrls, setOriginalGalleryImageUrls] = useState<string[]>([])
  const [originalVideoUrl, setOriginalVideoUrl] = useState('')
  const [crewFields, setCrewFields] = useState<CrewProfileFormValues>(crewProfileToForm(null))

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<UpdateEquipmentFormData>({
    resolver: zodResolver(updateEquipmentSchema) as import('react-hook-form').Resolver<UpdateEquipmentFormData>,
  })

  useEffect(() => {
    loadData()
  }, [id])

  useEffect(() => {
    const loadComboSettings = async () => {
      setComboSettingsLoading(true)
      try {
        const res = await fetch('/api/admin/settings/related-equipment-combo')
        if (res.ok) {
          const data = await res.json()
          setComboMessage(data.message ?? '')
          setComboDiscountPercent(data.discountPercent ?? 10)
        }
      } catch {
        setComboMessage(
          'لقد اخترنا لك إضافات ترفع من كفاءة معداتك بناءً على اختيارات خبراء ومستخدمين آخرين.\n[ أضفها الآن واحصل على خصم الـ Combo الخاص بك ]'
        )
        setComboDiscountPercent(10)
      } finally {
        setComboSettingsLoading(false)
      }
    }
    loadComboSettings()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [equipmentRes, categoriesRes, brandsRes] = await Promise.all([
        fetch(`/api/equipment/${id}`),
        fetch('/api/categories'),
        fetch('/api/brands'),
      ])

      if (!equipmentRes.ok) {
        throw new Error('فشل تحميل المعدة')
      }

      const equipmentData = await equipmentRes.json()
      setEquipment(equipmentData)
      setCrewFields(crewProfileToForm(equipmentData.customFields as Record<string, unknown>))

      // Get featured image (first image)
      const featuredImageRaw = equipmentData.media?.find((m: any) => m.type === 'image')?.url || ''
      const galleryImagesRaw =
        equipmentData.media
          ?.filter((m: any, i: number) => m.type === 'image' && i > 0)
          .map((m: any) => m.url) || []
      const videoRaw = equipmentData.media?.find((m: any) => m.type === 'video')?.url || ''

      const featuredImage = normalizeMediaUrl(featuredImageRaw)
      const galleryImages = galleryImagesRaw.map((url: string) => normalizeMediaUrl(url))
      const video = normalizeMediaUrl(videoRaw)

      // Remember originals to avoid re-creating identical media records on save
      setOriginalFeaturedImageUrl(featuredImage)
      setOriginalGalleryImageUrls(galleryImages)
      setOriginalVideoUrl(video)

      // Format translations from the translations object. Always populate all locales
      // so the form has the correct structure; use empty strings when no data.
      const locales = ['ar', 'en', 'zh', 'fr'] as const
      const translations: Array<{
        locale: 'ar' | 'en' | 'zh' | 'fr'
        name?: string
        description?: string
        shortDescription?: string
        seoTitle?: string
        seoDescription?: string
        seoKeywords?: string
      }> = locales.map((locale) => {
        const trans = equipmentData.translations?.[locale]
        return {
          locale,
          name: trans?.name ?? '',
          description: trans?.description ?? '',
          shortDescription: trans?.shortDescription ?? '',
          seoTitle: trans?.seoTitle ?? '',
          seoDescription: trans?.seoDescription ?? '',
          seoKeywords: trans?.seoKeywords ?? '',
        }
      })

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
        purchasePrice:
          equipmentData.purchasePrice != null ? Number(equipmentData.purchasePrice) : undefined,
        isActive: equipmentData.isActive,
        requiresAssistant: equipmentData.requiresAssistant ?? false,
        warehouseLocation: equipmentData.warehouseLocation || undefined,
        barcode: equipmentData.barcode || undefined,
        specifications: (equipmentData.specifications as Record<string, unknown>) || undefined,
        featuredImageUrl: featuredImage,
        galleryImageUrls: galleryImages,
        videoUrl: video,
        translations: translations.length > 0 ? translations : undefined,
        relatedEquipmentIds: equipmentData.relatedEquipmentIds || [],
        boxContents: equipmentData.boxContents || undefined,
        tags: equipmentData.tags || undefined,
        bufferTime: equipmentData.bufferTime || undefined,
        bufferTimeUnit: (equipmentData.bufferTimeUnit as 'hours' | 'days') || 'hours',
        featured: equipmentData.featured || false,
        depositAmount:
          equipmentData.customFields?.depositAmount != null
            ? Number(equipmentData.customFields.depositAmount)
            : undefined,
        requiresDeposit: (equipmentData.customFields?.requiresDeposit as boolean) ?? false,
        specConfidence: equipmentData.specConfidence ?? undefined,
        specLastInferredAt: equipmentData.specLastInferredAt
          ? new Date(equipmentData.specLastInferredAt)
          : undefined,
        specSource: equipmentData.specSource ?? undefined,
      })

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        const list = Array.isArray(categoriesData)
          ? categoriesData
          : (categoriesData?.categories ?? [])
        setCategories(Array.isArray(list) ? list : [])
      }

      if (brandsRes.ok) {
        const brandsData = await brandsRes.json()
        const list = Array.isArray(brandsData) ? brandsData : (brandsData?.brands ?? [])
        setBrands(Array.isArray(list) ? list : [])
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
      // Only send image/video fields if they actually changed to avoid duplicate media records
      const payload = { ...data }
      const isCrew =
        equipment?.category?.slug === 'crew' ||
        (equipment?.customFields as Record<string, unknown> | undefined)?.itemType === 'crew'
      if (isCrew) {
        Object.assign(payload, crewProfileFromForm(crewFields))
      }
      if (payload.featuredImageUrl === originalFeaturedImageUrl) {
        delete payload.featuredImageUrl
      }
      const currentGallery = payload.galleryImageUrls || []
      const galleryUnchanged =
        currentGallery.length === originalGalleryImageUrls.length &&
        currentGallery.every((url, i) => url === originalGalleryImageUrls[i])
      if (galleryUnchanged) {
        delete payload.galleryImageUrls
      }
      if (payload.videoUrl === originalVideoUrl) {
        delete payload.videoUrl
      }

      const response = await fetch(`/api/equipment/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(parseApiErrorPayload(error, 'فشل تحديث المعدة'))
      }

      const updatedEquipment = await response.json()
      const syncWarn = updatedEquipment.warnings?.syncToProduct as
        | { ok: false; message: string }
        | undefined
      if (syncWarn && syncWarn.ok === false) {
        toast({
          title: 'تم الحفظ',
          description: `تم الحفظ، لكن مزامنة مواصفات المنتج فشلت: ${syncWarn.message}`,
        })
      } else {
        toast({
          title: 'تم الحفظ',
          description: 'تم تحديث المعدة بنجاح',
        })
      }
      setShowSaveSuccess(true)
      window.setTimeout(() => setShowSaveSuccess(false), 2500)
      // Reload data in place to reflect saved state
      await loadData()

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

  const handleSaveMediaOnly = async () => {
    setSavingMediaOnly(true)
    try {
      const featuredImageUrl = watch('featuredImageUrl') || ''
      const galleryImageUrls = watch('galleryImageUrls') || []
      const videoUrl = watch('videoUrl') || ''

      const payload: Record<string, unknown> = {}
      if (featuredImageUrl !== originalFeaturedImageUrl) {
        payload.featuredImageUrl = featuredImageUrl
      }
      const galleryUnchanged = isGalleryUnchanged(galleryImageUrls, originalGalleryImageUrls)
      if (!galleryUnchanged) {
        payload.galleryImageUrls = galleryImageUrls
      }
      if (videoUrl !== originalVideoUrl) {
        payload.videoUrl = videoUrl
      }

      if (Object.keys(payload).length === 0) {
        toast({
          title: 'لا توجد تغييرات',
          description: 'لم يتم تعديل الصور أو الفيديو.',
        })
        return
      }

      const response = await fetch(`/api/equipment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(parseApiErrorPayload(error, 'فشل حفظ الوسائط'))
      }

      toast({
        title: 'تم حفظ الوسائط',
        description: 'تم حفظ الصور/الفيديو حتى مع وجود أخطاء في تبويبات أخرى.',
      })
      setShowSaveSuccess(true)
      window.setTimeout(() => setShowSaveSuccess(false), 2500)
      await loadData()
    } catch (error) {
      toast({
        title: 'تعذر حفظ الوسائط',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ الوسائط',
        variant: 'destructive',
      })
    } finally {
      setSavingMediaOnly(false)
    }
  }

  const onInvalidSubmit = (formErrors: import('react-hook-form').FieldErrors<UpdateEquipmentFormData>) => {
    const featuredImageUrl = watch('featuredImageUrl') || ''
    const galleryImageUrls = watch('galleryImageUrls') || []
    const videoUrl = watch('videoUrl') || ''
    const mediaChanged =
      featuredImageUrl !== originalFeaturedImageUrl ||
      !isGalleryUnchanged(galleryImageUrls, originalGalleryImageUrls) ||
      videoUrl !== originalVideoUrl

    const invalidFields = Object.keys(formErrors)
    const hasOnlyMediaErrors =
      invalidFields.length > 0 &&
      invalidFields.every((field) =>
        ['featuredImageUrl', 'galleryImageUrls', 'videoUrl'].includes(field)
      )

    // Preserve current media tab UX: if media changed and the blocking errors are in other tabs,
    // save media immediately without redirecting the user to specifications tab.
    if (mediaChanged && !hasOnlyMediaErrors) {
      toast({
        title: 'تم اكتشاف أخطاء في تبويبات أخرى',
        description: 'سيتم حفظ الوسائط فقط الآن بدون نقلك من تبويب الوسائط.',
      })
      void handleSaveMediaOnly()
      return
    }

    const firstInvalidField = invalidFields[0]
    if (firstInvalidField) {
      const targetTab = INVALID_FIELD_TAB_MAP[firstInvalidField]
      if (targetTab) {
        setActiveTab(targetTab)
      }
    }

    const visibleLabels = invalidFields
      .slice(0, 3)
      .map((field) => INVALID_FIELD_LABELS[field] ?? field)
    const hasMore = invalidFields.length > 3
    const fieldsText =
      visibleLabels.length > 0
        ? `الحقول غير الصالحة: ${visibleLabels.join('، ')}${hasMore ? ' ...' : ''}`
        : 'توجد حقول غير صالحة. راجع البيانات المطلوبة ثم أعد المحاولة.'

    toast({
      title: 'تعذر الحفظ',
      description: fieldsText,
      variant: 'destructive',
    })
  }

  const watchedTranslations = watch('translations') || []
  const watchedSpecifications = watch('specifications')
  const watchedCategoryId = watch('categoryId')
  const categoryHint = watchedCategoryId
    ? categories.find((c) => c.id === watchedCategoryId)?.name
    : undefined

  const photoCount =
    (watch('galleryImageUrls') || []).filter(Boolean).length + (watch('featuredImageUrl') ? 1 : 0)

  const formSections = useMemo(
    () => [
      {
        id: 'info',
        label: 'المعلومات الأساسية',
        status: (watch('sku') && watch('categoryId') ? 'complete' : 'warning') as
          | 'complete'
          | 'warning'
          | 'empty',
      },
      {
        id: 'content',
        label: 'المحتوى و SEO',
        status: (watchedTranslations.some((t) => t.name) ? 'complete' : 'empty') as
          | 'complete'
          | 'warning'
          | 'empty',
      },
      {
        id: 'media',
        label: 'الوسائط',
        status: (photoCount >= 4 ? 'complete' : photoCount > 0 ? 'warning' : 'empty') as
          | 'complete'
          | 'warning'
          | 'empty',
        detail: `${photoCount}/4`,
      },
      {
        id: 'specs',
        label: 'المواصفات',
        status: (watchedSpecifications && Object.keys(watchedSpecifications).length > 0
          ? 'complete'
          : 'empty') as 'complete' | 'warning' | 'empty',
      },
      { id: 'related', label: 'ذات الصلة', status: 'complete' as const },
    ],
    [watch('sku'), watch('categoryId'), watchedTranslations, watchedSpecifications, photoCount]
  )

  const translationDataForSwitcher = useMemo((): Record<'ar' | 'en' | 'zh' | 'fr', TranslationData> => {
    const base = { ar: {}, en: {}, zh: {}, fr: {} } as Record<'ar' | 'en' | 'zh' | 'fr', TranslationData>
    for (const t of watchedTranslations) {
      const loc = t.locale as 'ar' | 'en' | 'zh' | 'fr'
      if (base[loc]) {
        base[loc] = {
          name: t.name,
          shortDescription: t.shortDescription,
          description: t.description,
          seoTitle: t.seoTitle,
          seoDescription: t.seoDescription,
          seoKeywords: t.seoKeywords,
        }
      }
    }
    return base
  }, [watchedTranslations])

  /** Fetch AI suggestions from the API (shared by preview + auto-fill) */
  const fetchAISuggestion = async (): Promise<AISuggestPayload | null> => {
    const name = watch('model') || watch('sku') || ''
    const categoryId = watch('categoryId')
    if (!name.trim() || !categoryId) return null
    const firstTrans = (watch('translations') || [])[0]
    const res = await fetch('/api/admin/equipment/ai-suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        categoryId,
        brandId: watch('brandId') || undefined,
        existingSpecs: watch('specifications') ?? undefined,
        existingShortDescription: firstTrans?.shortDescription ?? firstTrans?.description,
        existingLongDescription: firstTrans?.description ?? firstTrans?.longDescription,
      }),
    })
    if (!res.ok) throw new Error(await res.json().then((d) => d.error || 'Failed'))
    const data = await res.json()
    return {
      specs: data.specs ?? {},
      structuredSpecs: data.structuredSpecs ?? undefined,
      shortDescription: data.shortDescription ?? '',
      longDescription: data.longDescription ?? '',
      seo: data.seo ?? { metaTitle: '', metaDescription: '', metaKeywords: '' },
      boxContents: data.boxContents,
      tags: data.tags,
      relatedEquipmentIds: data.relatedEquipmentIds,
      translations: data.translations,
      confidence: data.confidence,
    }
  }

  const handleAISuggest = async () => {
    const name = watch('model') || watch('sku') || ''
    const categoryId = watch('categoryId')
    if (!name.trim() || !categoryId) {
      toast({
        title: 'أدخل الموديل/الاسم والفئة',
        description: 'الموديل أو SKU والفئة مطلوبان لاقتراح AI',
        variant: 'destructive',
      })
      return
    }
    setAiSuggestLoading(true)
    setAiSuggestion(null)
    setShowAISuggest(true)
    try {
      const suggestion = await fetchAISuggestion()
      setAiSuggestion(suggestion)
    } catch (e) {
      toast({
        title: 'فشل اقتراح AI',
        description: e instanceof Error ? e.message : 'حدث خطأ',
        variant: 'destructive',
      })
      setShowAISuggest(false)
    } finally {
      setAiSuggestLoading(false)
    }
  }

  const handleSmartFill = async (scope: FillScope) => {
    setApplyScope(scope)
    await handleAISuggest()
  }

  /**
   * Apply AI suggestion to form. Accepts scope as a direct parameter
   * to avoid React state-batching race conditions.
   * Fills ALL 3 locales (ar/en/zh). Returns the count of fields filled.
   */
  const applyAISuggestion = (payload: AISuggestPayload, scope: FillScope): number => {
    let filledCount = 0

    // --- Specs ---
    if (scope === 'all' || scope === 'specs') {
      if (payload.specs && Object.keys(payload.specs).length > 0) {
        const current = watch('specifications')
        const isCurrentStructured =
          current &&
          typeof current === 'object' &&
          'groups' in current &&
          Array.isArray((current as Record<string, unknown>).groups)

        if (payload.structuredSpecs && payload.structuredSpecs.groups?.length > 0) {
          // ✅ API returned proper structured specs — use directly, preserving any existing data
          // Merge: if current already has structured groups, merge new specs into existing groups
          // otherwise just replace with the AI structured version
          if (isCurrentStructured) {
            // Merge new highlights/quickSpecs if current ones are empty
            const cur = current as import('@/lib/types/specifications.types').StructuredSpecifications
            const merged = {
              ...payload.structuredSpecs,
              highlights:
                !cur.highlights || cur.highlights.length === 0
                  ? payload.structuredSpecs.highlights
                  : cur.highlights,
              quickSpecs:
                !cur.quickSpecs || cur.quickSpecs.length === 0
                  ? payload.structuredSpecs.quickSpecs
                  : cur.quickSpecs,
              // Merge groups: add specs from AI groups that are missing in current groups
              groups: payload.structuredSpecs.groups.map((aiGroup) => {
                const existingGroup = cur.groups.find((g) => g.label === aiGroup.label)
                if (!existingGroup) return aiGroup
                // Add specs from AI group that aren't already in existing group
                const existingKeys = new Set(existingGroup.specs.map((s) => s.key))
                const newSpecs = aiGroup.specs.filter(
                  (s) =>
                    !existingKeys.has(s.key) ||
                    !existingGroup.specs.find(
                      (e) => e.key === s.key && e.value && String(e.value).trim() !== ''
                    )
                )
                return {
                  ...existingGroup,
                  specs: [
                    ...existingGroup.specs.map((s) => {
                      const val = String(s.value ?? '').trim()
                      const isCorruptOrEmpty = !val || val.includes('[object Object]') || val === 'undefined'
                      if (isCorruptOrEmpty) {
                        const aiSpec = aiGroup.specs.find((a) => a.key === s.key)
                        return aiSpec ? { ...s, value: String(aiSpec.value ?? '').trim() } : s
                      }
                      return s
                    }),
                    ...newSpecs
                      .filter((ns) => !existingGroup.specs.find((e) => e.key === ns.key))
                      .map((ns) => ({ ...ns, value: String(ns.value ?? '').trim() })),
                  ],
                }
              }),
            }
            setValue(
              'specifications',
              merged as UpdateEquipmentFormData['specifications']
            )
          } else {
            // Current is flat or empty — replace with AI structured specs
            setValue(
              'specifications',
              payload.structuredSpecs as UpdateEquipmentFormData['specifications']
            )
          }
          filledCount += Object.keys(payload.specs).length
        } else {
          // Fallback: flat merge (only fill empty keys in current flat specs)
          const currentFlat = (current as Record<string, unknown> | undefined) ?? {}
          const merged: Record<string, string> = {}
          // Copy current values as strings
          for (const [k, v] of Object.entries(currentFlat)) {
            merged[k] = String(v ?? '').trim()
          }
          // Merge AI suggestions safely
          for (const [k, v] of Object.entries(payload.specs)) {
            const existing = merged[k]
            // Treat [object Object] as empty during merge
            const isCorrupt = existing?.includes('[object Object]')
            if (existing == null || existing === '' || isCorrupt) {
              merged[k] = String(v ?? '').trim()
              filledCount++
            }
          }
          setValue('specifications', merged as UpdateEquipmentFormData['specifications'])
        }

        if (payload.confidence && Object.keys(payload.confidence).length > 0) {
          const specConfidences = Object.entries(payload.confidence).filter(
            ([k]) =>
              ![
                'shortDescription',
                'longDescription',
                'seoTitle',
                'seoDescription',
                'boxContents',
                'tags',
              ].includes(k)
          )
          const avg =
            specConfidences.length > 0
              ? specConfidences.reduce((s, [, v]) => s + (typeof v === 'number' ? v : 0), 0) /
                specConfidences.length
              : undefined
          if (avg != null && !Number.isNaN(avg)) {
            setValue('specConfidence', Math.min(1, Math.max(0, avg / 100)))
            setValue('specLastInferredAt', new Date())
            setValue('specSource', 'ai-infer')
          }
        }
      }
    }

    // --- Multilingual translations (ar/en/zh) — read fresh from form ---
    if (
      scope === 'all' ||
      scope === 'descriptions' ||
      scope === 'seo' ||
      scope === 'translations'
    ) {
      const locales = ['ar', 'en', 'zh', 'fr'] as const
      const trans = [...(watch('translations') || [])]

      for (const locale of locales) {
        const aiLocale = payload.translations?.[locale]
        let idx = trans.findIndex((t) => t.locale === locale)
        if (idx < 0) {
          trans.push({ locale, name: '' } as NonNullable<
            UpdateEquipmentFormData['translations']
          >[number])
          idx = trans.length - 1
        }
        const t = { ...trans[idx] }

        if (scope === 'all' || scope === 'descriptions' || scope === 'translations') {
          if (!t.name || String(t.name).trim() === '') {
            const aiName = aiLocale?.name
            if (aiName && aiName.trim() !== '') {
              t.name = aiName
              filledCount++
            }
          }
          if (!t.shortDescription || String(t.shortDescription).trim() === '') {
            const aiShort =
              aiLocale?.shortDescription ?? (locale === 'en' ? payload.shortDescription : '')
            if (aiShort && aiShort.trim() !== '') {
              t.shortDescription = aiShort
              filledCount++
            }
          }
          if (!t.description || String(t.description).trim() === '') {
            const aiLong =
              aiLocale?.longDescription ?? (locale === 'en' ? payload.longDescription : '')
            if (aiLong && aiLong.trim() !== '') {
              t.description = aiLong
              filledCount++
            }
          }
        }
        if (scope === 'all' || scope === 'seo' || scope === 'translations') {
          if (!t.seoTitle || String(t.seoTitle).trim() === '') {
            const aiTitle = aiLocale?.seoTitle ?? (locale === 'en' ? payload.seo?.metaTitle : '')
            if (aiTitle && aiTitle.trim() !== '') {
              t.seoTitle = aiTitle
              filledCount++
            }
          }
          if (!t.seoDescription || String(t.seoDescription).trim() === '') {
            const aiDesc =
              aiLocale?.seoDescription ?? (locale === 'en' ? payload.seo?.metaDescription : '')
            if (aiDesc && aiDesc.trim() !== '') {
              t.seoDescription = aiDesc
              filledCount++
            }
          }
          if (!t.seoKeywords || String(t.seoKeywords).trim() === '') {
            const aiKw = stringifySeoKeywords(
              aiLocale?.seoKeywords ?? (locale === 'en' ? payload.seo?.metaKeywords : '')
            )
            if (aiKw) {
              t.seoKeywords = aiKw
              filledCount++
            }
          }
        }
        trans[idx] = t
      }
      setValue('translations', trans)
    }

    // --- Box contents ---
    if (scope === 'all' && payload.boxContents != null) {
      const current = watch('boxContents')
      if (!current || String(current).trim() === '') {
        if (String(payload.boxContents).trim() !== '') {
          setValue('boxContents', payload.boxContents)
          filledCount++
        }
      }
    }

    // --- Related equipment ---
    if (scope === 'all' && payload.relatedEquipmentIds?.length) {
      const current = watch('relatedEquipmentIds') || []
      if (current.length === 0) {
        setValue('relatedEquipmentIds', payload.relatedEquipmentIds)
        filledCount++
      }
    }

    return filledCount
  }

  /** Wrapper used by the preview dialog's Apply button */
  const handleApplyAISuggestion = (payload: AISuggestPayload) => {
    const count = applyAISuggestion(payload, applyScope)
    toast({ title: `تم تطبيق ${count} حقل من اقتراح AI` })
  }

  /**
   * One-click Auto AI Fill: fetches AI content and directly applies to all fields
   * without showing the preview dialog.
   */
  const handleAutoFill = async () => {
    const name = watch('model') || watch('sku') || ''
    const categoryId = watch('categoryId')
    if (!name.trim() || !categoryId) {
      toast({
        title: 'أدخل الموديل/الاسم والفئة أولاً',
        description: 'الموديل أو SKU والفئة مطلوبان للملء التلقائي',
        variant: 'destructive',
      })
      return
    }
    setAutoFilling(true)
    setAiFilled(false)
    try {
      const suggestion = await fetchAISuggestion()
      if (!suggestion) {
        toast({
          title: 'لم يتم إنشاء محتوى',
          description: 'تعذر الحصول على اقتراحات AI',
          variant: 'destructive',
        })
        return
      }
      const count = applyAISuggestion(suggestion, 'all')
      setAiFilled(true)
      setAiFilledCount(count)
      toast({
        title: `تم ملء ${count} حقل تلقائياً`,
        description: 'الأوصاف والترجمات وSEO والمواصفات — عربي/إنجليزي/صيني',
      })
    } catch (e) {
      toast({
        title: 'فشل الملء التلقائي',
        description: e instanceof Error ? e.message : 'حدث خطأ',
        variant: 'destructive',
      })
    } finally {
      setAutoFilling(false)
    }
  }

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
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2 border-sky-300 text-sky-700 hover:bg-sky-50 hover:text-sky-800 hidden md:flex">
            <Link href={`/equipment/${equipment.slug || equipment.id}`} target="_blank">
              <ExternalLink className="h-4 w-4" />
              رؤية في الموقع
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
            onClick={handleAutoFill}
            disabled={
              submitting || autoFilling || !(watch('model') || watch('sku')) || !watch('categoryId')
            }
            title="يتطلب الموديل/SKU والفئة — يملأ جميع الحقول الفارغة بالذكاء الاصطناعي لـ 3 لغات"
          >
            {autoFilling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {autoFilling ? 'جاري الملء...' : 'ملء تلقائي AI'}
          </Button>
          <SmartFillDropdown
            onFill={handleSmartFill}
            disabled={submitting || autoFilling || !watch('categoryId')}
            photoGateLocked={false}
          />
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            إلغاء
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit(
              onSubmit as import('react-hook-form').SubmitHandler<UpdateEquipmentFormData>,
              onInvalidSubmit
            )}
            disabled={submitting || autoFilling}
          >
            {submitting && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            <Save className="ms-2 h-4 w-4" />
            حفظ التغييرات
          </Button>
        </div>
      </div>

      {/* AI Status Banner */}
      {autoFilling && (
        <div className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <div>
            <span className="font-medium">جاري إنشاء المحتوى بالذكاء الاصطناعي...</span>
            <span className="me-1 text-violet-600">
              الأوصاف والترجمات وSEO والمواصفات لـ 3 لغات
            </span>
          </div>
        </div>
      )}
      {aiFilled && !autoFilling && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <div>
            <span className="font-medium">تم ملء {aiFilledCount} حقل بنجاح</span>
            <span className="me-1 text-emerald-600">— راجع التبويبات أدناه ثم اضغط حفظ</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="me-auto text-xs text-emerald-600 hover:text-emerald-800"
            onClick={() => setAiFilled(false)}
          >
            إخفاء
          </Button>
        </div>
      )}

      <AISuggestPreviewDialog
        open={showAISuggest}
        onOpenChange={setShowAISuggest}
        loading={aiSuggestLoading}
        suggestion={aiSuggestion}
        onApply={handleApplyAISuggestion}
      />

      <div className="flex gap-6">
        <form
          onSubmit={handleSubmit(
            onSubmit as import('react-hook-form').SubmitHandler<UpdateEquipmentFormData>,
            onInvalidSubmit
          )}
          className="flex-1 space-y-6"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="info">المعلومات الأساسية</TabsTrigger>
              <TabsTrigger value="content" className="relative">
                المحتوى و SEO
                {aiFilled && (
                  <span className="absolute -left-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="media">الوسائط</TabsTrigger>
              <TabsTrigger value="specs" className="relative">
                المواصفات
                {aiFilled && (
                  <span className="absolute -left-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="related">ذات الصلة</TabsTrigger>
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
                      <Label htmlFor="sku">SKU</Label>
                      <Input id="sku" {...register('sku')} placeholder="اختياري — يُولَّد تلقائياً عند الإنشاء إن تُرك فارغاً" dir={EMBED_LTR} />
                      {errors.sku && <p className="text-sm text-error-600">{errors.sku.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="model">الموديل *</Label>
                      <Input id="model" {...register('model')} placeholder="Sony FX3" required />
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
                          {(categories ?? []).map((cat) => (
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

                    {(equipment?.category?.slug === 'crew' ||
                      (equipment?.customFields as Record<string, unknown> | undefined)?.itemType ===
                        'crew') && (
                      <div className="md:col-span-2">
                        <CrewEquipmentFields
                          values={crewFields}
                          onChange={(patch) => setCrewFields((prev) => ({ ...prev, ...patch }))}
                        />
                      </div>
                    )}

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
                          {(brands ?? []).map((brand) => (
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
                        dir={EMBED_LTR}
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
                        dir="rtl"
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
                        dir="rtl"
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
                        dir="rtl"
                      />
                      {errors.monthlyPrice && (
                        <p className="text-sm text-error-600">{errors.monthlyPrice.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="depositAmount">مبلغ التأمين (اختياري)</Label>
                      <Input
                        id="depositAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        {...register('depositAmount', { valueAsNumber: true })}
                        placeholder="0.00"
                        dir="rtl"
                      />
                      {errors.depositAmount && (
                        <p className="text-sm text-error-600">{errors.depositAmount.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="requiresDeposit"
                        type="checkbox"
                        className="h-4 w-4 rounded border-neutral-300"
                        {...register('requiresDeposit')}
                      />
                      <Label htmlFor="requiresDeposit" className="cursor-pointer">
                        التأمين إلزامي للعميل
                      </Label>
                    </div>
                    <p className="text-xs text-neutral-500 md:col-span-2">
                      الافتراضي: لا يتطلب تأمين. فعّل إذا كان هذا المنتج يتطلب تأميناً من العميل.
                    </p>
                    <div className="border-t border-neutral-200 pt-4 mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 md:col-span-3">
                      <div className="space-y-2">
                        <Label htmlFor="bufferTime">وقت التحضير والصيانة (Buffer Time)</Label>
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
                          onValueChange={(value) =>
                            setValue('bufferTimeUnit', value as 'hours' | 'days')
                          }
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

                    <div className="border-t border-neutral-200 pt-4 md:col-span-3">
                      <div className="space-y-2 max-w-xs">
                        <Label htmlFor="purchasePrice" className="text-neutral-500">
                          سعر الشراء
                        </Label>
                        <Input
                          id="purchasePrice"
                          type="number"
                          min="0"
                          step="0.01"
                          {...register('purchasePrice', { valueAsNumber: true })}
                          placeholder="0.00"
                          dir="rtl"
                        />
                        <p className="text-xs text-neutral-500">
                          للتتبع وسند الأمر فقط — لا يظهر للعميل
                        </p>
                        {errors.purchasePrice && (
                          <p className="text-sm text-error-600">{errors.purchasePrice.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>الإعدادات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="featured"
                        {...register('featured')}
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                      <Label htmlFor="featured" className="cursor-pointer">
                        معدة مميزة (Featured)
                      </Label>
                    </div>
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
                        id="requiresAssistant"
                        {...register('requiresAssistant')}
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                      <Label htmlFor="requiresAssistant" className="cursor-pointer">
                        يتطلب مساعداً (Requires Assistant)
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Content (Translations, SEO, Tags, BoxContents) */}
            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>الترجمات</CardTitle>
                  <p className="mt-2 text-sm text-neutral-600">
                    أدخل معلومات المعدة بلغات متعددة. العربية مطلوبة كحد أدنى.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TranslationTabSwitcher
                    activeLocale={activeLocale}
                    onLocaleChange={setActiveLocale}
                    translations={translationDataForSwitcher}
                    onCopyLocale={(from, to) => {
                      const fromT = watchedTranslations.find((t) => t.locale === from)
                      if (!fromT) return
                      const current = [...watchedTranslations]
                      const toIndex = current.findIndex((t) => t.locale === to)
                      const target =
                        toIndex >= 0
                          ? current[toIndex]
                          : {
                              locale: to,
                              name: '',
                              description: '',
                              shortDescription: '',
                              seoTitle: '',
                              seoDescription: '',
                              seoKeywords: '',
                            }
                      const updated = {
                        ...target,
                        name: fromT.name ?? target.name,
                        shortDescription: fromT.shortDescription ?? target.shortDescription,
                        description: fromT.description ?? target.description,
                        seoTitle: fromT.seoTitle ?? target.seoTitle,
                        seoDescription: fromT.seoDescription ?? target.seoDescription,
                        seoKeywords: fromT.seoKeywords ?? target.seoKeywords,
                      }
                      if (toIndex >= 0) {
                        current[toIndex] = updated
                      } else {
                        current.push(updated)
                      }
                      setValue('translations', current)
                    }}
                  />
                  {([activeLocale] as const).map((locale) => {
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
                            setValue('translations', [
                              ...current,
                              { locale, name: newValue.name ?? '', ...newValue },
                            ])
                          }
                        }}
                        defaultExpanded={true}
                      />
                    )
                  })}
                  {errors.translations && (
                    <p className="text-sm text-error-600">{errors.translations.message}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>SEO (تحسين محركات البحث)</CardTitle>
                  <p className="mt-2 text-sm text-neutral-600">
                    أدخل معلومات SEO لكل لغة لتحسين ظهور المعدة في نتائج البحث.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(['ar', 'en', 'zh', 'fr'] as const).map((locale) => {
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
                            setValue('translations', [
                              ...current,
                              {
                                name: ('name' in translation ? translation.name : '') ?? '',
                                ...translation,
                                ...newValue,
                              },
                            ])
                          }
                        }}
                        name={'name' in translation ? translation.name : ''}
                        shortDescription={
                          'shortDescription' in translation ? translation.shortDescription : ''
                        }
                        defaultExpanded={locale === 'ar'}
                      />
                    )
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>إضافات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="boxContents">محتوى الصندوق</Label>
                      <Textarea
                        id="boxContents"
                        {...register('boxContents')}
                        placeholder="ماذا يوجد داخل الصندوق؟"
                        rows={4}
                        dir="rtl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tags">الوسوم (Tags)</Label>
                      <Input
                        id="tags"
                        {...register('tags')}
                        placeholder="كاميرا, سينما, تصوير, 4K..."
                        dir="rtl"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 4: Media */}
            <TabsContent value="media" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>الوسائط</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveMediaOnly}
                      disabled={savingMediaOnly || submitting}
                    >
                      {savingMediaOnly && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                      حفظ الوسائط فقط
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <PhotoGateIndicator photoCount={photoCount} />
                  <ImageUpload
                    value={watch('featuredImageUrl')}
                    onChange={(url) => setValue('featuredImageUrl', url, { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
                    label="الصورة المميزة"
                    equipmentId={id}
                  />

                  <ImageGallery
                    value={watch('galleryImageUrls') || []}
                    onChange={(urls) => setValue('galleryImageUrls', urls, { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
                    label="معرض الصور"
                    equipmentId={id}
                  />

                  <VideoUrlInput
                    value={watch('videoUrl')}
                    onChange={(url) => setValue('videoUrl', url, { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
                    label="رابط الفيديو"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 5: Specifications */}
            <TabsContent value="specs" className="space-y-6">
              <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_340px]">
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle>المواصفات</CardTitle>
                    <p className="mt-2 text-sm text-neutral-600">
                    أدخل المواصفات بشكل منظم. ابدأ بالتحرير المباشر ثم راجع المعاينة قبل الحفظ.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <SpecificationsEditor
                      value={watchedSpecifications ?? undefined}
                      onChange={(specs) => setValue('specifications', specs)}
                      categoryHint={categoryHint}
                      onAiInfer={async () => {
                        const name = watch('model') || watch('sku') || ''
                        const categoryId = watch('categoryId')
                        if (!name.trim() || !categoryId) return null
                        const res = await fetch('/api/admin/equipment/ai-suggest', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: name.trim(),
                            categoryId,
                            brandId: watch('brandId') || undefined,
                            existingSpecs: watchedSpecifications ?? undefined,
                          }),
                        })
                        if (!res.ok) return null
                        const data = await res.json()
                        return (data.specs ?? null) as Record<string, unknown> | null
                      }}
                    />
                  </CardContent>
                </Card>
                <SpecificationsLivePreview specifications={(watchedSpecifications ?? undefined) as import('@/lib/types/specifications.types').AnySpecifications | undefined} />
              </div>

              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-dashed border-border-light bg-surface-light/30 p-4 transition-colors hover:bg-surface-light/50">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-text-muted transition-colors group-hover:text-brand-primary" />
                    <CardTitle className="text-sm">حوكمة المواصفات (للمتقدمين)</CardTitle>
                  </div>
                  <ChevronDown className="h-4 w-4 text-text-muted transition-transform group-open:rotate-180" />
                </summary>
                <Card className="mt-2 border-dashed shadow-none">
                  <CardContent className="grid gap-4 pt-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-neutral-500">مصدر المواصفات (specSource)</p>
                      <p className="font-medium" dir="ltr">
                        {watch('specSource') ?? equipment?.specSource ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">ثقة الاستنتاج (specConfidence)</p>
                      <p className="font-medium">
                        {watch('specConfidence') != null
                          ? `${Math.round(Number(watch('specConfidence')) * 100)}%`
                          : equipment?.specConfidence != null
                            ? `${Math.round(Number(equipment.specConfidence) * 100)}%`
                            : '—'}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-neutral-500">آخر استنتاج (specLastInferredAt)</p>
                      <p className="font-medium" dir="ltr">
                        {watch('specLastInferredAt')
                          ? new Date(watch('specLastInferredAt') as Date).toLocaleString('ar-SA')
                          : equipment?.specLastInferredAt
                            ? new Date(equipment.specLastInferredAt).toLocaleString('ar-SA')
                            : '—'}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-neutral-500">القائمة السوداء (specBlacklist)</p>
                      <pre className="mt-1 max-h-32 overflow-auto rounded-md border bg-neutral-50 p-2 text-xs" dir="ltr">
                        {equipment?.specBlacklist != null
                          ? JSON.stringify(equipment.specBlacklist, null, 2)
                          : '—'}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </details>
            </TabsContent>

            {/* Tab 6: Related Equipment */}
            <TabsContent value="related" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>رسالة عرض المعدات ذات الصلة</CardTitle>
                  <p className="mt-2 text-sm text-neutral-600">
                    رسالة تظهر للعميل فوق قائمة المعدات الموصى بها. المدير يستطيع التحكم بالرسالة
                    ونسبة خصم الـ Combo.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {comboSettingsLoading ? (
                    <p className="text-sm text-neutral-500">جاري تحميل الإعدادات...</p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="comboMessage">نص الرسالة</Label>
                        <Textarea
                          id="comboMessage"
                          value={comboMessage}
                          onChange={(e) => setComboMessage(e.target.value)}
                          placeholder="لقد اخترنا لك إضافات ترفع من كفاءة معداتك..."
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-2 min-w-[120px]">
                          <Label htmlFor="comboDiscountPercent">نسبة خصم Combo (%)</Label>
                          <Input
                            id="comboDiscountPercent"
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={comboDiscountPercent}
                            onChange={(e) =>
                              setComboDiscountPercent(
                                Math.min(100, Math.max(0, Number(e.target.value) || 0))
                              )
                            }
                            dir="rtl"
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          disabled={comboSettingsSaving}
                          onClick={async () => {
                            setComboSettingsSaving(true)
                            try {
                              const res = await fetch(
                                '/api/admin/settings/related-equipment-combo',
                                {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    message: comboMessage,
                                    discountPercent: comboDiscountPercent,
                                  }),
                                }
                              )
                              if (!res.ok) throw new Error('فشل الحفظ')
                              toast({
                                title: 'تم الحفظ',
                                description: 'تم حفظ رسالة العرض ونسبة الخصم بنجاح',
                              })
                            } catch {
                              toast({
                                title: 'خطأ',
                                description: 'فشل حفظ الإعدادات',
                                variant: 'destructive',
                              })
                            } finally {
                              setComboSettingsSaving(false)
                            }
                          }}
                        >
                          {comboSettingsSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'حفظ الرسالة ونسبة الخصم'
                          )}
                        </Button>
                      </div>
                      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                        <p className="font-medium mb-1">معاينة للعميل:</p>
                        <p className="whitespace-pre-wrap">{comboMessage || '—'}</p>
                        {comboDiscountPercent > 0 && (
                          <p className="mt-2 text-neutral-600">
                            خصم Combo: {comboDiscountPercent}%
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>المعدات ذات الصلة</CardTitle>
                  <p className="mt-2 text-sm text-neutral-600">
                    اختر المعدات المرتبطة بهذه المعدة (معدات موصى بها).
                  </p>
                </CardHeader>
                <CardContent>
                  <RelatedEquipmentSelector
                    value={watch('relatedEquipmentIds') || []}
                    onChange={(ids) => setValue('relatedEquipmentIds', ids)}
                    excludeId={id}
                  />
                </CardContent>
              </Card>
            </TabsContent>


          </Tabs>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 border-t pt-6">
            {showSaveSuccess && (
              <div className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700">
                تم الحفظ بنجاح
              </div>
            )}
            <Button type="button" variant="outline" onClick={() => router.back()}>
              إلغاء
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              حفظ التغييرات
              <ArrowRight className="me-2 h-4 w-4" />
            </Button>
          </div>
        </form>
        <aside className="hidden w-64 shrink-0 lg:block">
          <FormProgressSidebar
            sections={formSections}
            activeSection={activeTab}
            onSectionClick={setActiveTab}
          >
            <PhotoGateIndicator photoCount={photoCount} />
            <SmartFillDropdown
              onFill={handleSmartFill}
              disabled={submitting}
              photoGateLocked={false}
            />
          </FormProgressSidebar>
        </aside>
      </div>
    </div>
  )
}
