'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  children?: { id: string; name: string }[]
}

interface Brand {
  id: string
  name: string
}

interface VendorEquipmentFormProps {
  categories: Category[]
  brands: Brand[]
  vendorId: string
}

export function VendorEquipmentForm({
  categories,
  brands,
  vendorId: _vendorId,
}: VendorEquipmentFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    sku: '',
    model: '',
    categoryId: '',
    brandId: '',
    condition: 'GOOD' as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR',
    quantityTotal: 1,
    specifications: {} as Record<string, unknown>,
    boxContents: '',
    featuredImageUrl: '',
    galleryImageUrls: [] as string[],
    videoUrl: '',
    translations: [
      { locale: 'ar' as const, name: '', description: '', shortDescription: '' },
      { locale: 'en' as const, name: '', description: '', shortDescription: '' },
    ],
  })

  const flatCategories = categories.flatMap((c) =>
    c.children?.length
      ? c.children.map((ch) => ({ id: ch.id, name: `${c.name} / ${ch.name}` }))
      : [{ id: c.id, name: c.name }]
  )
  if (flatCategories.length === 0 && categories.length > 0) {
    flatCategories.push(...categories.map((c) => ({ id: c.id, name: c.name })))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.categoryId || !form.sku) {
      toast({
        title: 'خطأ',
        description: 'يجب ملء الحقول المطلوبة (SKU، الفئة)',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/vendor/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: form.sku,
          model: form.model || undefined,
          categoryId: form.categoryId,
          brandId: form.brandId || undefined,
          condition: form.condition,
          quantityTotal: form.quantityTotal,
          specifications: Object.keys(form.specifications).length ? form.specifications : undefined,
          boxContents: form.boxContents || undefined,
          featuredImageUrl: form.featuredImageUrl || undefined,
          galleryImageUrls: form.galleryImageUrls.length ? form.galleryImageUrls : undefined,
          videoUrl: form.videoUrl || undefined,
          translations: form.translations
            .filter((t) => t.name)
            .map((t) => ({
              locale: t.locale,
              name: t.name,
              description: t.description || undefined,
              shortDescription: t.shortDescription || undefined,
            })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || err.error || 'Failed to submit')
      }

      toast({
        title: 'تم الإرسال',
        description: 'سيتم مراجعة المعدات من قبل الإدارة قبل النشر',
      })
      router.push('/vendor/equipment')
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل في إرسال الطلب',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sku">رمز SKU *</Label>
          <Input
            id="sku"
            value={form.sku}
            onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
            placeholder="مثال: CAM-001"
            required
          />
        </div>
        <div>
          <Label htmlFor="model">الموديل</Label>
          <Input
            id="model"
            value={form.model}
            onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
            placeholder="اسم الموديل"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="categoryId">الفئة *</Label>
          <Select
            value={form.categoryId}
            onValueChange={(v) => setForm((p) => ({ ...p, categoryId: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الفئة" />
            </SelectTrigger>
            <SelectContent>
              {flatCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="brandId">العلامة التجارية</Label>
          <Select
            value={form.brandId}
            onValueChange={(v) => setForm((p) => ({ ...p, brandId: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر العلامة" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="condition">الحالة</Label>
          <Select
            value={form.condition}
            onValueChange={(v: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR') =>
              setForm((p) => ({ ...p, condition: v }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXCELLENT">ممتاز</SelectItem>
              <SelectItem value="GOOD">جيد</SelectItem>
              <SelectItem value="FAIR">مقبول</SelectItem>
              <SelectItem value="POOR">ضعيف</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="quantityTotal">الكمية</Label>
          <Input
            id="quantityTotal"
            type="number"
            min={1}
            value={form.quantityTotal}
            onChange={(e) =>
              setForm((p) => ({ ...p, quantityTotal: parseInt(e.target.value) || 1 }))
            }
          />
        </div>
      </div>

      <div>
        <Label htmlFor="boxContents">محتويات العلبة</Label>
        <Textarea
          id="boxContents"
          value={form.boxContents}
          onChange={(e) => setForm((p) => ({ ...p, boxContents: e.target.value }))}
          placeholder="وصف المحتويات"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="featuredImageUrl">رابط صورة رئيسية</Label>
        <Input
          id="featuredImageUrl"
          type="url"
          value={form.featuredImageUrl}
          onChange={(e) => setForm((p) => ({ ...p, featuredImageUrl: e.target.value }))}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label>الترجمات</Label>
        {form.translations.map((t, i) => (
          <div key={t.locale} className="p-3 border rounded-lg space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t.locale === 'ar' ? 'العربية' : 'English'}
            </span>
            <Input
              placeholder="الاسم"
              value={t.name}
              onChange={(e) =>
                setForm((p) => {
                  const next = [...p.translations]
                  next[i] = { ...next[i], name: e.target.value }
                  return { ...p, translations: next }
                })
              }
            />
            <Textarea
              placeholder="الوصف المختصر"
              value={t.shortDescription}
              onChange={(e) =>
                setForm((p) => {
                  const next = [...p.translations]
                  next[i] = { ...next[i], shortDescription: e.target.value }
                  return { ...p, translations: next }
                })
              }
              rows={2}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
          إرسال للمراجعة
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/vendor/equipment')}
        >
          إلغاء
        </Button>
      </div>
    </form>
  )
}
