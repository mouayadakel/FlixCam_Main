/**
 * @file clients/new/page.tsx
 * @description Create new client page
 * @module app/admin/(routes)/clients/new
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Loader2, Plus, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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

const createClientSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  name: z.string().min(2, 'الاسم مطلوب (حرفين على الأقل)'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  nationalId: z.string().optional(),
  companyName: z.string().optional(),
  taxNumber: z.string().optional(),
  notes: z.string().optional(),
  role: z.enum(['CUSTOMER', 'CORPORATE']),
})

type CreateClientInput = z.infer<typeof createClientSchema>

export default function NewClientPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      role: 'CUSTOMER',
    },
  })

  const role = watch('role')

  const onSubmit = async (data: CreateClientInput) => {
    setLoading(true)
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل إنشاء العميل')
      }

      const client = await response.json()

      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء العميل بنجاح',
      })

      router.push(`/admin/clients/${client.id || client.data?.id}`)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إنشاء العميل',
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
            <User className="h-8 w-8" />
            عميل جديد
          </h1>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/clients">
            <ArrowRight className="ms-2 h-4 w-4" />
            إلغاء
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>المعلومات الأساسية</CardTitle>
            <CardDescription>معلومات الاتصال الأساسية للعميل</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="أحمد محمد"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="email@example.com"
                  className={errors.email ? 'border-destructive' : ''}
                  dir="ltr"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+966 5XX XXX XXXX"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">نوع العميل</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setValue('role', value as 'CUSTOMER' | 'CORPORATE')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">فرد</SelectItem>
                    <SelectItem value="CORPORATE">شركة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>العنوان</CardTitle>
            <CardDescription>عنوان العميل للتوصيل</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">العنوان</Label>
                <Input id="address" {...register('address')} placeholder="الشارع، الحي، المبنى" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">المدينة</Label>
                <Select onValueChange={(value) => setValue('city', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المدينة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="الرياض">الرياض</SelectItem>
                    <SelectItem value="جدة">جدة</SelectItem>
                    <SelectItem value="الدمام">الدمام</SelectItem>
                    <SelectItem value="مكة">مكة المكرمة</SelectItem>
                    <SelectItem value="المدينة">المدينة المنورة</SelectItem>
                    <SelectItem value="الخبر">الخبر</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identity & Business */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات الهوية والأعمال</CardTitle>
            <CardDescription>معلومات إضافية للتحقق والفوترة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nationalId">رقم الهوية / الإقامة</Label>
                <Input
                  id="nationalId"
                  {...register('nationalId')}
                  placeholder="10 أرقام"
                  dir="ltr"
                />
              </div>

              {role === 'CORPORATE' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">اسم الشركة</Label>
                    <Input id="companyName" {...register('companyName')} placeholder="اسم الشركة" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxNumber">الرقم الضريبي</Label>
                    <Input
                      id="taxNumber"
                      {...register('taxNumber')}
                      placeholder="15 رقم"
                      dir="ltr"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>ملاحظات</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea {...register('notes')} placeholder="ملاحظات إضافية عن العميل..." rows={4} />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/clients">إلغاء</Link>
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
                إنشاء العميل
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
