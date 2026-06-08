/**
 * Content tab: Hero, FAQ, "What's included"
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Plus, X, Trash2, Sparkles, HelpCircle, ListChecks, Loader2 } from 'lucide-react'

interface ContentTabProps {
  cmsData: any
  onSave: (data: any) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  saving: boolean
}

export function CmsPackageContentTab({ cmsData, onSave, onDirtyChange, saving }: ContentTabProps) {
  const [form, setForm] = useState({
    heroTitle: '',
    heroSubtitle: '',
    faqs: [] as { q: string; a: string }[],
    whatsIncluded: [] as string[],
    notIncluded: [] as string[],
  })

  useEffect(() => {
    if (cmsData) {
      setForm({
        heroTitle: cmsData.heroTitle ?? '',
        heroSubtitle: cmsData.heroSubtitle ?? '',
        faqs: Array.isArray(cmsData.faqs) ? cmsData.faqs : [],
        whatsIncluded: Array.isArray(cmsData.whatsIncluded) ? cmsData.whatsIncluded : [],
        notIncluded: Array.isArray(cmsData.notIncluded) ? cmsData.notIncluded : [],
      })
    }
  }, [cmsData])

  const handleChange = (patch: any) => {
    setForm((f) => ({ ...f, ...patch }))
    onDirtyChange(true)
  }

  // FAQ helpers
  const updateFaq = (i: number, field: 'q' | 'a', val: string) => {
    const arr = [...form.faqs]
    arr[i] = { ...arr[i], [field]: val }
    handleChange({ faqs: arr })
  }
  const addFaq = () => handleChange({ faqs: [...form.faqs, { q: '', a: '' }] })
  const removeFaq = (i: number) => handleChange({ faqs: form.faqs.filter((_, idx) => idx !== i) })

  // Lists helpers
  const updateList = (field: 'whatsIncluded' | 'notIncluded', i: number, val: string) => {
    const arr = [...form[field]]
    arr[i] = val
    handleChange({ [field]: arr })
  }
  const addToList = (field: 'whatsIncluded' | 'notIncluded') =>
    handleChange({ [field]: [...form[field], ''] })
  const removeFromList = (field: 'whatsIncluded' | 'notIncluded', i: number) =>
    handleChange({ [field]: form[field].filter((_, idx) => idx !== i) })

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
        <CardTitle>محتوى الصفحة</CardTitle>
        <CardDescription>تحكم في النصوص المعروضة داخل صفحة تفاصيل الباقة</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Hero Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Sparkles className="h-5 w-5" />
              <span>قسم الـ Hero (أعلى الصفحة)</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="heroTitle">عنوان Hero الرئيسي</Label>
                <Input
                  id="heroTitle"
                  value={form.heroTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange({ heroTitle: e.target.value })}
                  placeholder="مثال: باقة الإنتاج السينمائي الاحترافية"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroSubtitle">وصف Hero (Subtitle)</Label>
                <Textarea
                  id="heroSubtitle"
                  value={form.heroSubtitle}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange({ heroSubtitle: e.target.value })}
                  placeholder="وصف جذاب يظهر أسفل العنوان الرئيسي..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Included / Not Included */}
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-green-600">
                  <ListChecks className="h-5 w-5" />
                  <span>ماذا تشمل الباقة؟</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => addToList('whatsIncluded')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {form.whatsIncluded.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={item}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateList('whatsIncluded', i, e.target.value)}
                      placeholder="مثال: توصيل مجاني لموقع التصوير"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFromList('whatsIncluded', i)} className="h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-red-600">
                  <X className="h-5 w-5" />
                  <span>ماذا لا تشمل؟</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => addToList('notIncluded')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {form.notIncluded.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={item}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateList('notIncluded', i, e.target.value)}
                      placeholder="مثال: مصور أو طاقم عمل"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFromList('notIncluded', i)} className="h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* FAQ Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-amber-600">
                <HelpCircle className="h-5 w-5" />
                <span>الأسئلة الشائعة (FAQ)</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addFaq}>
                <Plus className="me-1 h-4 w-4" />
                إضافة سؤال
              </Button>
            </div>
            <div className="space-y-4">
              {form.faqs.map((faq, i) => (
                <Card key={i} className="bg-muted/30">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">سؤال {i + 1}</Label>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeFaq(i)} className="h-7 w-7 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      value={faq.q}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFaq(i, 'q', e.target.value)}
                      placeholder="السؤال..."
                    />
                    <Textarea
                      value={faq.a}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateFaq(i, 'a', e.target.value)}
                      placeholder="الإجابة..."
                      rows={2}
                    />
                  </CardContent>
                </Card>
              ))}
              {form.faqs.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-xl">
                  لا توجد أسئلة شائعة مضافة. انقر على إضافة سؤال للبدء.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin ms-2" /> : null}
              حفظ محتوى الصفحة
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
