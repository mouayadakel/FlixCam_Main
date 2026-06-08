/**
 * @file page.tsx
 * @description Admin - Manage public website pages (Phase 5.1)
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, Globe, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

interface WebsitePageItem {
  id: string
  slug: string
  titleAr: string
  titleEn: string
  titleZh: string | null
  isPublished: boolean
  seo: unknown
  sectionsCount: number
  createdAt: string
  updatedAt: string
}

interface HomeSectionItem {
  id: string
  key: string
  label: string
  order: number
  isVisible: boolean
  settings?: {
    maxItems?: number
    compactMode?: 'compact' | 'comfortable'
    showProductCount?: boolean
    hideWithoutLogo?: boolean
  }
}

interface CategoryItem {
  id: string
  name: string
  slug: string
  isActive: boolean
  sortOrder: number
  equipmentCount: number
}

interface BrandItem {
  id: string
  name: string
  logoUrl: string | null
}

const SECTION_DEFAULT_ORDER: Record<string, number> = {
  categories: 10,
  featured: 20,
  studios: 30,
  new_arrivals: 40,
  kit_teaser: 50,
  trust_signals: 60,
  top_brands: 70,
  testimonials: 80,
  faq: 90,
  cta: 100,
  how_it_works: 110,
}

function normalizeSections(list: HomeSectionItem[]) {
  return [...list]
    .map((s) => ({
      key: s.key,
      order: s.order,
      isVisible: s.isVisible,
      settings: {
        maxItems: s.settings?.maxItems,
        compactMode: s.settings?.compactMode,
        showProductCount: s.settings?.showProductCount,
        hideWithoutLogo: s.settings?.hideWithoutLogo,
      },
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

function normalizeCategories(list: CategoryItem[]) {
  return [...list]
    .map((c) => ({ id: c.id, isActive: c.isActive, sortOrder: c.sortOrder }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (data?.message) return String(data.message)
    if (data?.error) return String(data.error)
    if (data?.details) return String(data.details)
  } catch {
    // ignore parse errors
  }
  return `Request failed (${res.status})`
}

export default function WebsitePagesPage() {
  const { toast } = useToast()
  const [pages, setPages] = useState<WebsitePageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [homeSections, setHomeSections] = useState<HomeSectionItem[]>([])
  const [initialHomeSections, setInitialHomeSections] = useState<HomeSectionItem[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [sectionsSaving, setSectionsSaving] = useState(false)
  const [sectionsError, setSectionsError] = useState<string | null>(null)
  const [canUpdateSettings, setCanUpdateSettings] = useState(true)
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [initialCategories, setInitialCategories] = useState<CategoryItem[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesSaving, setCategoriesSaving] = useState(false)
  const [brands, setBrands] = useState<BrandItem[]>([])
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null)
  const [draggingSectionKey, setDraggingSectionKey] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPages() {
      try {
        const res = await fetch('/api/admin/website-pages')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setPages(data.pages ?? [])
      } catch {
        setPages([])
      } finally {
        setLoading(false)
      }
    }
    fetchPages()
  }, [])

  useEffect(() => {
    async function fetchBrands() {
      try {
        const res = await fetch('/api/brands')
        if (!res.ok) return
        const data = await res.json()
        const list = Array.isArray(data.brands) ? data.brands : []
        setBrands(list)
      } catch {
        setBrands([])
      }
    }
    fetchBrands()
  }, [])

  useEffect(() => {
    async function fetchHomeSections() {
      try {
        setSectionsError(null)
        const res = await fetch('/api/admin/website-pages/home-sections')
        if (!res.ok) throw new Error(await parseApiError(res))
        const data = await res.json()
        const sections = Array.isArray(data.sections) ? data.sections : []
        setHomeSections(sections)
        setInitialHomeSections(sections)
        setCanUpdateSettings(Boolean(data.canUpdate))
      } catch (error) {
        setSectionsError(error instanceof Error ? error.message : 'Failed to load homepage controls')
        setHomeSections([])
        setInitialHomeSections([])
      } finally {
        setSectionsLoading(false)
      }
    }
    fetchHomeSections()
  }, [])

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories')
        if (!res.ok) throw new Error(await parseApiError(res))
        const data = await res.json()
        const list = Array.isArray(data.categories) ? data.categories : []
        setCategories(list)
        setInitialCategories(list)
      } catch {
        setCategories([])
        setInitialCategories([])
      } finally {
        setCategoriesLoading(false)
      }
    }
    fetchCategories()
  }, [])

  const sectionsDirty = useMemo(
    () =>
      JSON.stringify(normalizeSections(homeSections)) !== JSON.stringify(normalizeSections(initialHomeSections)),
    [homeSections, initialHomeSections]
  )
  const categoriesDirty = useMemo(
    () =>
      JSON.stringify(normalizeCategories(categories)) !==
      JSON.stringify(normalizeCategories(initialCategories)),
    [categories, initialCategories]
  )

  const duplicateSectionOrders = useMemo(() => {
    const seen = new Set<number>()
    const duplicates: number[] = []
    for (const section of homeSections) {
      if (seen.has(section.order)) duplicates.push(section.order)
      seen.add(section.order)
    }
    return duplicates
  }, [homeSections])
  const criticalVisibleCount = useMemo(() => {
    const critical = new Set(['categories', 'featured', 'new_arrivals', 'top_brands'])
    return homeSections.filter((section) => critical.has(section.key) && section.isVisible).length
  }, [homeSections])

  const brandsMissingLogoCount = useMemo(
    () => brands.filter((brand) => !brand.logoUrl || brand.logoUrl.trim() === '').length,
    [brands]
  )

  const saveHomeSections = async () => {
    if (!sectionsDirty) return
    if (duplicateSectionOrders.length > 0) {
      toast({
        title: 'خطأ في الترتيب',
        description: 'لا يمكن تكرار أرقام ترتيب الأقسام',
        variant: 'destructive',
      })
      return
    }
    if (criticalVisibleCount === 0) {
      toast({
        title: 'تحذير',
        description: 'يجب إبقاء قسم رئيسي واحد على الأقل مرئياً',
        variant: 'destructive',
      })
      return
    }

    try {
      setSectionsSaving(true)
      setSectionsError(null)
      const res = await fetch('/api/admin/website-pages/home-sections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: homeSections.map((section) => ({
            key: section.key,
            order: section.order,
            isVisible: section.isVisible,
            settings: section.settings ?? {},
          })),
        }),
      })
      if (!res.ok) throw new Error(await parseApiError(res))
      const data = await res.json()
      const sections = Array.isArray(data.sections) ? data.sections : []
      setHomeSections(sections)
      setInitialHomeSections(sections)
      toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات الصفحة الرئيسية بنجاح' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save'
      setSectionsError(message)
      toast({ title: 'فشل الحفظ', description: message, variant: 'destructive' })
    } finally {
      setSectionsSaving(false)
    }
  }

  const saveCategoryRow = async (row: CategoryItem) => {
    try {
      const res = await fetch(`/api/categories/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: row.isActive, sortOrder: row.sortOrder }),
      })
      if (!res.ok) throw new Error(await parseApiError(res))
      const data = await res.json()
      setCategories((prev) =>
        prev.map((c) =>
          c.id === row.id ? { ...c, isActive: data.isActive ?? c.isActive, sortOrder: data.sortOrder ?? c.sortOrder } : c
        )
      )
      setInitialCategories((prev) =>
        prev.map((c) =>
          c.id === row.id ? { ...c, isActive: data.isActive ?? c.isActive, sortOrder: data.sortOrder ?? c.sortOrder } : c
        )
      )
      toast({ title: 'تم التحديث', description: `تم تحديث ${row.name}` })
      return true
    } catch (error) {
      toast({
        title: 'فشل تحديث التصنيف',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
      return false
    }
  }

  const saveAllCategories = async () => {
    if (!categoriesDirty) return
    setCategoriesSaving(true)
    try {
      const baseline = [...initialCategories]
      let failed = false
      for (const row of categories) {
        const original = baseline.find((b) => b.id === row.id)
        if (!original) continue
        if (original.isActive === row.isActive && original.sortOrder === row.sortOrder) continue
        const ok = await saveCategoryRow(row)
        if (!ok) {
          failed = true
          setCategories(baseline)
          break
        }
      }
      if (!failed) {
        setInitialCategories(categories)
        toast({ title: 'تم الحفظ', description: 'تم حفظ جميع تغييرات التصنيفات' })
      }
    } finally {
      setCategoriesSaving(false)
    }
  }

  const reorderCategories = (dragId: string, targetId: string) => {
    if (dragId === targetId) return
    const sorted = categories
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    const from = sorted.findIndex((c) => c.id === dragId)
    const to = sorted.findIndex((c) => c.id === targetId)
    if (from === -1 || to === -1) return

    const moved = [...sorted]
    const [item] = moved.splice(from, 1)
    moved.splice(to, 0, item)

    const reassigned = moved.map((c, idx) => ({ ...c, sortOrder: (idx + 1) * 10 }))
    const byId = new Map(reassigned.map((c) => [c.id, c]))
    setCategories((prev) => prev.map((c) => byId.get(c.id) ?? c))
  }

  const resetSectionOrderToDefault = () => {
    setHomeSections((prev) =>
      prev.map((section) => ({
        ...section,
        order: SECTION_DEFAULT_ORDER[section.key] ?? section.order,
      }))
    )
  }

  const setAllSectionsVisibility = (isVisible: boolean) => {
    setHomeSections((prev) => prev.map((section) => ({ ...section, isVisible })))
  }

  const reorderSections = (dragKey: string, targetKey: string) => {
    if (dragKey === targetKey) return
    const sorted = homeSections.slice().sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    const from = sorted.findIndex((s) => s.key === dragKey)
    const to = sorted.findIndex((s) => s.key === targetKey)
    if (from === -1 || to === -1) return

    const moved = [...sorted]
    const [item] = moved.splice(from, 1)
    moved.splice(to, 0, item)

    const reindexed = moved.map((s, idx) => ({ ...s, order: (idx + 1) * 10 }))
    const byKey = new Map(reindexed.map((s) => [s.key, s]))
    setHomeSections((prev) => prev.map((s) => byKey.get(s.key) ?? s))
  }

  const sortedSectionPreview = [...homeSections].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">صفحات الموقع العام</h1>
        <p className="mt-2 text-muted-foreground">
          إدارة صفحات الموقع العام (الرئيسية، عن، سياسات، إلخ)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            الصفحات
          </CardTitle>
          <CardDescription>
            الصفحات المخزنة في قاعدة البيانات. التحرير الكامل (المحتوى والأقسام) قيد التطوير.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pages.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              لا توجد صفحات مسجلة. يمكن إضافتها عبر البذور أو واجهة التحرير لاحقاً.
            </div>
          ) : (
            <div className="space-y-3">
              {pages.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {p.titleAr} / {p.titleEn}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        /{p.slug} · {p.sectionsCount} أقسام
                      </div>
                    </div>
                    {p.isPublished ? (
                      <Badge variant="default">منشور</Badge>
                    ) : (
                      <Badge variant="secondary">مسودة</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/`} target="_blank" rel="noopener noreferrer">
                        عرض
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" disabled title="قريباً">
                      تحرير
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تحكم أقسام الصفحة الرئيسية</CardTitle>
          <CardDescription>
            تفعيل/تعطيل وترتيب ظهور أقسام الصفحة الرئيسية. رقم أقل يعني ظهور أعلى.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sectionsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : homeSections.length === 0 ? (
            <div className="text-sm text-muted-foreground">لا توجد أقسام قابلة للتحكم حالياً.</div>
          ) : (
            <div className="space-y-3">
              {!canUpdateSettings && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  لا تملك صلاحية الحفظ. تحتاج إذن <code>SETTINGS_UPDATE</code>.
                </div>
              )}
              {sectionsError && (
                <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  {sectionsError}
                </div>
              )}
              {duplicateSectionOrders.length > 0 && (
                <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  يوجد تكرار في أرقام الترتيب: {duplicateSectionOrders.join(', ')}
                </div>
              )}
              {criticalVisibleCount === 0 && (
                <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  يجب إبقاء قسم رئيسي واحد على الأقل (Categories / Featured / New Arrivals / Top Brands).
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={resetSectionOrderToDefault}>
                  إعادة الترتيب الافتراضي
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAllSectionsVisibility(true)}>
                  تفعيل كل الأقسام
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAllSectionsVisibility(false)}>
                  تعطيل كل الأقسام
                </Button>
              </div>
              <div className="rounded-md border border-border-light/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                Drag section rows to reorder quickly, then save.
              </div>
              {homeSections.map((section) => (
                <div
                  key={section.key}
                  className={`space-y-2 rounded-md border p-3 ${
                    draggingSectionKey === section.key ? 'opacity-60 ring-2 ring-brand-primary/30' : ''
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (draggingSectionKey) reorderSections(draggingSectionKey, section.key)
                    setDraggingSectionKey(null)
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded border border-border-light/70 text-muted-foreground hover:bg-muted active:cursor-grabbing"
                        draggable
                        onDragStart={() => setDraggingSectionKey(section.key)}
                        onDragEnd={() => setDraggingSectionKey(null)}
                        aria-label={`Drag ${section.label}`}
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <span className="hidden text-xs text-muted-foreground md:inline">اسحب للترتيب</span>
                      <div>
                      <p className="font-medium">{section.label}</p>
                      <p className="text-xs text-muted-foreground">{section.key}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={0}
                        value={section.order}
                        className="h-8 w-20"
                        onChange={(e) => {
                          const order = Number(e.target.value || 0)
                          setHomeSections((prev) =>
                            prev.map((s) => (s.key === section.key ? { ...s, order } : s))
                          )
                        }}
                      />
                      <Switch
                        checked={section.isVisible}
                        onCheckedChange={(isVisible) => {
                          setHomeSections((prev) =>
                            prev.map((s) => (s.key === section.key ? { ...s, isVisible } : s))
                          )
                        }}
                        aria-label={`Toggle ${section.label}`}
                      />
                    </div>
                  </div>

                  {(section.key === 'categories' ||
                    section.key === 'new_arrivals' ||
                    section.key === 'top_brands') && (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Max items</p>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={section.settings?.maxItems ?? ''}
                          onChange={(e) => {
                            const maxItems = Number(e.target.value || 0)
                            setHomeSections((prev) =>
                              prev.map((s) =>
                                s.key === section.key
                                  ? { ...s, settings: { ...s.settings, maxItems } }
                                  : s
                              )
                            )
                          }}
                        />
                      </div>

                      {(section.key === 'categories' || section.key === 'top_brands') && (
                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                          <span className="text-xs text-muted-foreground">Show product count</span>
                          <Switch
                            checked={Boolean(section.settings?.showProductCount)}
                            onCheckedChange={(showProductCount) =>
                              setHomeSections((prev) =>
                                prev.map((s) =>
                                  s.key === section.key
                                    ? { ...s, settings: { ...s.settings, showProductCount } }
                                    : s
                                )
                              )
                            }
                          />
                        </div>
                      )}

                      {(section.key === 'categories' || section.key === 'top_brands') && (
                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                          <span className="text-xs text-muted-foreground">Density mode</span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant={section.settings?.compactMode !== 'comfortable' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() =>
                                setHomeSections((prev) =>
                                  prev.map((s) =>
                                    s.key === section.key
                                      ? { ...s, settings: { ...s.settings, compactMode: 'compact' } }
                                      : s
                                  )
                                )
                              }
                            >
                              Compact
                            </Button>
                            <Button
                              type="button"
                              variant={section.settings?.compactMode === 'comfortable' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() =>
                                setHomeSections((prev) =>
                                  prev.map((s) =>
                                    s.key === section.key
                                      ? { ...s, settings: { ...s.settings, compactMode: 'comfortable' } }
                                      : s
                                  )
                                )
                              }
                            >
                              Comfortable
                            </Button>
                          </div>
                        </div>
                      )}

                      {section.key === 'top_brands' && (
                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                          <span className="text-xs text-muted-foreground">Hide brands without logos</span>
                          <Switch
                            checked={Boolean(section.settings?.hideWithoutLogo)}
                            onCheckedChange={(hideWithoutLogo) =>
                              setHomeSections((prev) =>
                                prev.map((s) =>
                                  s.key === section.key
                                    ? { ...s, settings: { ...s.settings, hideWithoutLogo } }
                                    : s
                                )
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">Preview order</p>
                <div className="flex flex-wrap gap-2">
                  {sortedSectionPreview.map((s) => (
                    <Badge key={s.key} variant="outline">
                      {s.order} - {s.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={saveHomeSections}
                  disabled={
                    sectionsSaving ||
                    !sectionsDirty ||
                    !canUpdateSettings ||
                    duplicateSectionOrders.length > 0 ||
                    criticalVisibleCount === 0
                  }
                >
                  {sectionsSaving ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    'حفظ إعدادات الأقسام'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تحكم تصنيفات الصفحة الرئيسية</CardTitle>
          <CardDescription>
            ترتيب وتمكين التصنيفات الظاهرة في واجهة الصفحة الرئيسية.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد تصنيفات.</p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border border-border-light/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                Drag category rows to reorder quickly, then click &quot;حفظ كل التصنيفات&quot;.
              </div>
              <div className="rounded-md border border-border-light/60 bg-muted/30 p-3 text-sm">
                <p>
                  التصنيفات بدون شعار في أبرز العلامات: <strong>{brandsMissingLogoCount}</strong>
                </p>
                <div className="mt-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/inventory/brands">فتح إدارة العلامات التجارية</Link>
                  </Button>
                </div>
              </div>

              {categories
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
                .map((category) => (
                  <div
                    key={category.id}
                    className={`grid grid-cols-1 items-center gap-3 rounded-md border p-3 md:grid-cols-[1fr_auto_auto_auto] ${
                      draggingCategoryId === category.id ? 'opacity-60 ring-2 ring-brand-primary/30' : ''
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (draggingCategoryId) reorderCategories(draggingCategoryId, category.id)
                      setDraggingCategoryId(null)
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        className="mt-0.5 inline-flex h-8 w-8 cursor-grab items-center justify-center rounded border border-border-light/70 text-muted-foreground hover:bg-muted active:cursor-grabbing"
                        draggable
                        onDragStart={() => setDraggingCategoryId(category.id)}
                        onDragEnd={() => setDraggingCategoryId(null)}
                        aria-label={`Drag ${category.name}`}
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <span className="hidden pt-1 text-xs text-muted-foreground md:inline">اسحب للترتيب</span>
                      <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.slug} - {category.equipmentCount} items
                      </p>
                      </div>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-24"
                      value={category.sortOrder}
                      onChange={(e) => {
                        const sortOrder = Number(e.target.value || 0)
                        setCategories((prev) =>
                          prev.map((c) => (c.id === category.id ? { ...c, sortOrder } : c))
                        )
                      }}
                    />
                    <Switch
                      checked={category.isActive}
                      onCheckedChange={(isActive) => {
                        setCategories((prev) =>
                          prev.map((c) => (c.id === category.id ? { ...c, isActive } : c))
                        )
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveCategoryRow(category)}
                      disabled={categoriesSaving}
                    >
                      حفظ الصف
                    </Button>
                  </div>
                ))}

              <div className="pt-2">
                <Button onClick={saveAllCategories} disabled={categoriesSaving || !categoriesDirty}>
                  {categoriesSaving ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    'حفظ كل التصنيفات'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
