/**
 * Marketing tab: Badges, highlights, taglines, sorting, visibility
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Plus, X, Tag, Star, BarChart3, Loader2 } from 'lucide-react'

const BADGE_COLORS = [
  { value: 'green', label: 'أخضر', class: 'bg-green-500' },
  { value: 'blue', label: 'أزرق', class: 'bg-blue-500' },
  { value: 'orange', label: 'برتقالي', class: 'bg-orange-500' },
  { value: 'red', label: 'أحمر', class: 'bg-red-500' },
  { value: 'purple', label: 'بنفسجي', class: 'bg-purple-500' },
  { value: 'gold', label: 'ذهبي', class: 'bg-yellow-500' },
]

interface EquipmentTabProps {
  initialItems: any[]
  discountPercent: number
  onSave: (items: { equipmentId: string; quantity: number }[]) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

interface MarketingTabProps {
  cmsData: any
  onSave: (data: any) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsPackageMarketingTab({ cmsData, onSave, onDirtyChange, saving }: MarketingTabProps) {
  const [form, setForm] = useState({
    badgeText: '',
    badgeColor: 'green',
    tagline: '',
    socialProofCount: '',
    highlights: [] as string[],
    featured: false,
    recommended: false,
    sortOrder: 0,
  })

  useEffect(() => {
    if (cmsData) {
      setForm({
        badgeText: cmsData.badgeText ?? '',
        badgeColor: cmsData.badgeColor ?? 'green',
        tagline: cmsData.tagline ?? '',
        socialProofCount: cmsData.socialProofCount ?? '',
        highlights: Array.isArray(cmsData.highlights) ? cmsData.highlights : [],
        featured: !!cmsData.featured,
        recommended: !!cmsData.recommended,
        sortOrder: Number(cmsData.sortOrder ?? 0),
      })
    }
  }, [cmsData])

  const handleChange = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }))
    onDirtyChange(true)
  }

  const updateHighlight = (i: number, val: string) => {
    const arr = [...form.highlights]
    arr[i] = val
    handleChange({ highlights: arr })
  }

  const addHighlight = () => handleChange({ highlights: [...form.highlights, ''] })
  const removeHighlight = (i: number) =>
    handleChange({ highlights: form.highlights.filter((_, idx) => idx !== i) })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({
      ...cmsData,
      ...form,
    })
    onDirtyChange(false)
  }

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle>التسويق والعرض</CardTitle>
        <CardDescription>البادج، العلامات المميزة، وترتيب الباقة في الموقع</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-semibold">
                <Tag className="h-4 w-4" />
                <span>البادج (Badge)</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="badgeText">نص البادج</Label>
                <Input
                  id="badgeText"
                  value={form.badgeText}
                  onChange={(e) => handleChange({ badgeText: e.target.value })}
                  placeholder="مثال: الأكثر طلباً"
                />
              </div>
              <div className="space-y-2">
                <Label>لون البادج</Label>
                <div className="flex flex-wrap gap-2">
                  {BADGE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => handleChange({ badgeColor: c.value })}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all ${
                        form.badgeColor === c.value
                          ? 'border-primary bg-primary/10 font-semibold'
                          : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                    >
                      <span className={`inline-block h-3 w-3 rounded-full ${c.class}`} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 font-semibold">
                <Star className="h-4 w-4" />
                <span>الظهور والتوصيات</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="featured">باقة مميزة</Label>
                  <Switch
                    id="featured"
                    checked={form.featured}
                    onCheckedChange={(v) => handleChange({ featured: v })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="recommended">موصى بها</Label>
                  <Switch
                    id="recommended"
                    checked={form.recommended}
                    onCheckedChange={(v) => handleChange({ recommended: v })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">ترتيب العرض (كلما قل الرقم ظهر أولاً)</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => handleChange({ sortOrder: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tagline">جملة تسويقية قصيرة (Tagline)</Label>
              <Input
                id="tagline"
                value={form.tagline}
                onChange={(e) => handleChange({ tagline: e.target.value })}
                placeholder="مثال: كل ما تحتاجه لتصوير 4K"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="socialProof">نص الثقة (Social Proof)</Label>
              <Input
                id="socialProof"
                value={form.socialProofCount}
                onChange={(e) => handleChange({ socialProofCount: e.target.value })}
                placeholder="مثال: +200 حجز ناجح"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <BarChart3 className="h-4 w-4" />
                <span>النقاط البارزة في كارت الباقة (Highlights)</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addHighlight}>
                <Plus className="me-1 h-4 w-4" />
                إضافة نقطة
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {form.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={h}
                    onChange={(e) => updateHighlight(i, e.target.value)}
                    placeholder={`نقطة ${i + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHighlight(i)}
                    className="h-8 w-8 text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {form.highlights.length === 0 && (
                <p className="col-span-2 text-center text-sm text-muted-foreground py-4">
                  لا توجد نقاط مضافة. ستظهر المعدات فقط.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : null}
              حفظ بيانات التسويق
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
