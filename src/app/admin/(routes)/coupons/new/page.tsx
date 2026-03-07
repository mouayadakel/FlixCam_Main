/**
 * @file coupons/new/page.tsx
 * @description Create new coupon page
 * @module app/admin/(routes)/coupons/new
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Plus, Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export default function NewCouponPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    code: '',
    type: 'percent',
    value: '',
    minPurchaseAmount: '',
    maxDiscountAmount: '',
    usageLimit: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    description: '',
    isActive: true,
  })

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, code })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.code) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال رمز الكوبون',
        variant: 'destructive',
      })
      return
    }

    if (!formData.value || Number(formData.value) <= 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال قيمة صحيحة للخصم',
        variant: 'destructive',
      })
      return
    }

    if (!formData.validUntil) {
      toast({
        title: 'خطأ',
        description: 'يرجى تحديد تاريخ الانتهاء',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: formData.code.toUpperCase(),
          type: formData.type,
          value: Number(formData.value),
          minPurchaseAmount: formData.minPurchaseAmount ? Number(formData.minPurchaseAmount) : null,
          maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
          usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
          validFrom: formData.validFrom,
          validUntil: formData.validUntil,
          description: formData.description || null,
          status: formData.isActive ? 'active' : 'inactive',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل إنشاء الكوبون')
      }

      const coupon = await response.json()

      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء الكوبون بنجاح',
      })

      router.push(`/admin/coupons/${coupon.id || coupon.data?.id}`)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إنشاء الكوبون',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Tag className="h-8 w-8" />
            كوبون جديد
          </h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/coupons">
            <ArrowRight className="ms-2 h-4 w-4" />
            إلغاء
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Code & Type */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات الكوبون</CardTitle>
            <CardDescription>رمز الكوبون ونوع الخصم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>رمز الكوبون *</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="SUMMER2024"
                    className="font-mono uppercase"
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    توليد
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>نوع الخصم</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">نسبة مئوية (%)</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت (ر.س)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>قيمة الخصم *</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max={formData.type === 'percent' ? 100 : undefined}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="10"
                  />
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {formData.type === 'percent' ? '%' : 'ر.س'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>حد الاستخدام (اختياري)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="غير محدود"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limits */}
        <Card>
          <CardHeader>
            <CardTitle>الحدود</CardTitle>
            <CardDescription>شروط تطبيق الخصم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>الحد الأدنى للشراء (اختياري)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.minPurchaseAmount}
                  onChange={(e) => setFormData({ ...formData, minPurchaseAmount: e.target.value })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  الحد الأدنى لقيمة الطلب لتطبيق الخصم
                </p>
              </div>

              {formData.type === 'percent' && (
                <div className="space-y-2">
                  <Label>الحد الأقصى للخصم (اختياري)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.maxDiscountAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, maxDiscountAmount: e.target.value })
                    }
                    placeholder="غير محدود"
                  />
                  <p className="text-xs text-muted-foreground">الحد الأقصى لمبلغ الخصم</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Validity */}
        <Card>
          <CardHeader>
            <CardTitle>فترة الصلاحية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>تاريخ البداية</Label>
                <Input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>تاريخ الانتهاء *</Label>
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  min={formData.validFrom}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description & Status */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات إضافية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف الكوبون والعرض..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>تفعيل الكوبون فوراً</Label>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/coupons">إلغاء</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="ms-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Plus className="ms-2 h-4 w-4" />
                إنشاء الكوبون
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
