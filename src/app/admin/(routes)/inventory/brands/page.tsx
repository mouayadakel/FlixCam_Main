/**
 * @file brands/page.tsx
 * @description Brand management page
 * @module app/admin/(routes)/inventory/brands
 */

'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Search, Tag, RefreshCw, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

interface Brand {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  website?: string | null
  description?: string | null
  isActive: boolean
  _count?: {
    products: number
  }
  equipmentCount?: number
  createdAt: string
}

type TopBrandsHomepageSettings = {
  maxItems: number
  hideWithoutLogo: boolean
}

const BRAND_DOMAIN_MAP: Record<string, string> = {
  sony: 'sony.com',
  canon: 'canon.com',
  arri: 'arri.com',
  red: 'red.com',
  blackmagic: 'blackmagicdesign.com',
  dji: 'dji.com',
  tilta: 'tilta.com',
  godox: 'godox.com',
  aputure: 'aputure.com',
  sennheiser: 'sennheiser.com',
  rode: 'rode.com',
  saramonic: 'saramonic.com',
  sigma: 'sigma-global.com',
  dzofilm: 'dzofilm.com',
  nanlux: 'nanlux.com',
  phottix: 'phottix.com',
  zoom: 'zoomcorp.com',
}

function getMappedBrandLogo(brand: Pick<Brand, 'name' | 'slug'>): string | null {
  const slugKey = (brand.slug ?? '').toLowerCase()
  const nameKey = brand.name.toLowerCase().replace(/\s+/g, '')
  const domain = BRAND_DOMAIN_MAP[slugKey] ?? BRAND_DOMAIN_MAP[nameKey]
  return domain ? `https://logo.clearbit.com/${domain}` : null
}

export default function BrandsPage() {
  const { toast } = useToast()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [homepageViewMode, setHomepageViewMode] = useState(true)
  const [homepageSettings, setHomepageSettings] = useState<TopBrandsHomepageSettings>({
    maxItems: 12,
    hideWithoutLogo: false,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logoUrl: '',
    website: '',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const loadBrands = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(homepageViewMode ? '/api/public/brands' : '/api/brands?view=raw')
      if (!response.ok) throw new Error('فشل تحميل العلامات التجارية')
      const data = await response.json()
      const source = Array.isArray(data?.brands) ? data.brands : Array.isArray(data?.data) ? data.data : []
      const mapped: Brand[] = source.map((brand: Record<string, unknown>) => ({
        id: String(brand.id ?? ''),
        name: String(brand.name ?? ''),
        slug: String(brand.slug ?? ''),
        logoUrl:
          typeof brand.logoUrl === 'string'
            ? brand.logoUrl
            : typeof brand.logo === 'string'
              ? brand.logo
              : null,
        website: typeof brand.website === 'string' ? brand.website : null,
        description: typeof brand.description === 'string' ? brand.description : null,
        isActive: typeof brand.isActive === 'boolean' ? brand.isActive : true,
        _count: { products: Number(brand?._count && (brand._count as { products?: number }).products) || 0 },
        equipmentCount: Number(brand.equipmentCount) || Number(brand?._count && (brand._count as { products?: number }).products) || 0,
        createdAt:
          typeof brand.createdAt === 'string' ? brand.createdAt : new Date().toISOString(),
      }))
      setBrands(mapped)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل العلامات التجارية',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [homepageViewMode, toast])

  const loadHomepageSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/website-pages/home-sections')
      if (!response.ok) return
      const data = await response.json()
      const sections = Array.isArray(data?.sections) ? data.sections : []
      const topBrands = sections.find((s: Record<string, unknown>) => s.key === 'top_brands')
      const settings =
        topBrands && typeof topBrands.settings === 'object'
          ? (topBrands.settings as { maxItems?: number; hideWithoutLogo?: boolean })
          : {}
      setHomepageSettings({
        maxItems: Number(settings.maxItems) > 0 ? Number(settings.maxItems) : 12,
        hideWithoutLogo: Boolean(settings.hideWithoutLogo),
      })
    } catch {
      setHomepageSettings({ maxItems: 12, hideWithoutLogo: false })
    }
  }, [])

  useEffect(() => {
    loadBrands()
  }, [loadBrands])

  useEffect(() => {
    loadHomepageSettings()
  }, [loadHomepageSettings])

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'خطأ', description: 'اسم العلامة التجارية مطلوب', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
          logoUrl: formData.logoUrl || null,
          website: formData.website || null,
          description: formData.description || null,
        }),
      })

      if (!response.ok) throw new Error('فشل إنشاء العلامة التجارية')

      toast({ title: 'نجح', description: 'تم إنشاء العلامة التجارية بنجاح' })
      setIsCreateOpen(false)
      resetForm()
      loadBrands()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إنشاء العلامة التجارية',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedBrand || !formData.name.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/brands/${selectedBrand.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          logoUrl: formData.logoUrl || null,
          website: formData.website || null,
          description: formData.description || null,
        }),
      })

      if (!response.ok) throw new Error('فشل تحديث العلامة التجارية')

      toast({ title: 'نجح', description: 'تم تحديث العلامة التجارية بنجاح' })
      setIsEditOpen(false)
      resetForm()
      loadBrands()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحديث العلامة التجارية',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedBrand) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/brands/${selectedBrand.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('فشل حذف العلامة التجارية')

      toast({ title: 'نجح', description: 'تم حذف العلامة التجارية بنجاح' })
      setIsDeleteOpen(false)
      setSelectedBrand(null)
      loadBrands()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل حذف العلامة التجارية',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (brand: Brand) => {
    setSelectedBrand(brand)
    setFormData({
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl || '',
      website: brand.website || '',
      description: brand.description || '',
    })
    setIsEditOpen(true)
  }

  const openDeleteDialog = (brand: Brand) => {
    setSelectedBrand(brand)
    setIsDeleteOpen(true)
  }

  const resetForm = () => {
    setFormData({ name: '', slug: '', logoUrl: '', website: '', description: '' })
    setSelectedBrand(null)
  }

  const homepageVisibleBrands = useMemo(() => {
    let list = brands
    if (homepageSettings.hideWithoutLogo) {
      list = list.filter((brand) => Boolean(brand.logoUrl || getMappedBrandLogo(brand)))
    }
    return list.slice(0, homepageSettings.maxItems)
  }, [brands, homepageSettings.hideWithoutLogo, homepageSettings.maxItems])

  const filteredBrands = (homepageViewMode ? homepageVisibleBrands : brands).filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Tag className="h-8 w-8" />
            العلامات التجارية
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {homepageViewMode
              ? `وضع عرض الصفحة الرئيسية: مطابق للصفحة العامة (حد أقصى ${homepageSettings.maxItems}، ${
                  homepageSettings.hideWithoutLogo ? 'إخفاء بدون شعار: نعم' : 'إخفاء بدون شعار: لا'
                })`
              : 'وضع العرض الخام: ترتيب إداري أبجدي'}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Label htmlFor="brands-view-mode" className="text-xs">
              عرض الصفحة الرئيسية
            </Label>
            <Switch
              id="brands-view-mode"
              checked={homepageViewMode}
              onCheckedChange={setHomepageViewMode}
            />
          </div>
          <Button variant="outline" onClick={loadBrands}>
            <RefreshCw className="ms-2 h-4 w-4" />
            تحديث
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  resetForm()
                  setIsCreateOpen(true)
                }}
              >
                <Plus className="ms-2 h-4 w-4" />
                علامة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة علامة تجارية</DialogTitle>
                <DialogDescription>أدخل بيانات العلامة التجارية الجديدة</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>الاسم *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: Canon"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الرابط (Slug)</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="مثال: canon"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رابط الشعار</Label>
                  <Input
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>الموقع الإلكتروني</Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.canon.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف مختصر..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? 'جاري الإنشاء...' : 'إنشاء'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <div className="relative max-w-md">
            <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pe-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Brands Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة العلامات التجارية ({filteredBrands.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشعار</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الرابط</TableHead>
                  <TableHead>المعدات</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="space-y-2 py-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredBrands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      لا توجد علامات تجارية
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBrands.map((brand) => (
                    <TableRow key={brand.id}>
                      <TableCell>
                        {brand.logoUrl ? (
                          <Image
                            src={brand.logoUrl}
                            alt={brand.name}
                            width={32}
                            height={32}
                            className="h-8 w-8 object-contain"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{brand.name}</TableCell>
                      <TableCell className="font-mono text-sm">{brand.slug}</TableCell>
                      <TableCell>{(brand.equipmentCount ?? brand._count?.products) || 0}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            brand.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {brand.isActive ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {brand.website && (
                            <a href={brand.website} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="ghost">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(brand)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openDeleteDialog(brand)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل العلامة التجارية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الاسم *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الرابط (Slug)</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>رابط الشعار</Label>
              <Input
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الموقع الإلكتروني</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العلامة التجارية</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف العلامة التجارية &quot;{selectedBrand?.name}&quot;؟
              {((selectedBrand?.equipmentCount ?? selectedBrand?._count?.products) || 0) > 0 && (
                <span className="mt-2 block text-destructive">
                  تحذير: هذه العلامة مرتبطة بـ{' '}
                  {(selectedBrand?.equipmentCount ?? selectedBrand?._count?.products) || 0} معدة
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting}>
              {submitting ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
