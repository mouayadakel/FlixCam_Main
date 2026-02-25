'use client'

/**
 * Portal profile form – name, phone (email read-only).
 * Uses public site theme: input border/radius/focus, primary CTA button.
 */

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ChevronDown, FileText } from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب').max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  companyName: z.string().max(200).optional().nullable(),
  billingAddress: z.string().max(500).optional().nullable(),
})

type ProfileFormData = z.infer<typeof profileSchema>

const INPUT_CLASS =
  'h-10 rounded-public-input border border-input bg-background px-3 text-body-main placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0'

export function PortalProfileForm() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string>('')

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phone: '',
      taxId: '',
      companyName: '',
      billingAddress: '',
    },
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/me')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setEmail(data.email ?? '')
          form.reset({
            name: data.name ?? '',
            phone: data.phone ?? '',
            taxId: data.taxId ?? '',
            companyName: data.companyName ?? '',
            billingAddress: data.billingAddress ?? '',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [form])

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name || undefined,
          phone: data.phone ?? null,
          taxId: data.taxId?.trim() || null,
          companyName: data.companyName?.trim() || null,
          billingAddress: data.billingAddress?.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast({ title: err.error ?? 'فشل الحفظ', variant: 'destructive' })
        return
      }
      toast({ title: 'تم حفظ التغييرات' })
    } catch {
      toast({ title: 'حدث خطأ', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="skeleton-brand h-4 w-24 rounded" />
          <div className="skeleton-brand h-10 w-full rounded-public-input" />
        </div>
        <div className="space-y-2">
          <div className="skeleton-brand h-4 w-32 rounded" />
          <div className="skeleton-brand h-10 w-full rounded-public-input" />
        </div>
        <div className="space-y-2">
          <div className="skeleton-brand h-4 w-28 rounded" />
          <div className="skeleton-brand h-10 w-full rounded-public-input" />
        </div>
        <div className="skeleton-brand h-10 w-32 rounded-public-button" />
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="profile-name" className="text-label-small text-foreground">
          الاسم
        </Label>
        <Input
          id="profile-name"
          {...form.register('name')}
          placeholder="الاسم الكامل"
          className={INPUT_CLASS}
        />
        {form.formState.errors.name && (
          <p className="text-label-small text-destructive" role="alert">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-email" className="text-label-small text-foreground">
          البريد الإلكتروني
        </Label>
        <Input
          id="profile-email"
          type="email"
          value={email}
          disabled
          className={INPUT_CLASS + ' bg-muted cursor-not-allowed'}
        />
        <p className="text-label-small text-muted-foreground">لا يمكن تغيير البريد من هنا</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-phone" className="text-label-small text-foreground">
          رقم الهاتف
        </Label>
        <Input
          id="profile-phone"
          {...form.register('phone')}
          placeholder="+966..."
          className={INPUT_CLASS}
        />
        {form.formState.errors.phone && (
          <p className="text-label-small text-destructive" role="alert">
            {form.formState.errors.phone.message}
          </p>
        )}
      </div>

      <Collapsible className="space-y-4">
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-public-input border border-input bg-muted/40 px-3 py-2.5 text-left text-body-main transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <FileText className="h-4 w-4" aria-hidden />
            معلومات الفاتورة والعنوان (اختياري)
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <p className="text-label-small text-muted-foreground">
            تُستخدم هذه البيانات على الفواتير وعروض الأسعار عند توفرها.
          </p>
          <div className="space-y-2">
            <Label htmlFor="profile-taxId" className="text-label-small text-foreground">
              الرقم الضريبي / VAT
            </Label>
            <Input
              id="profile-taxId"
              {...form.register('taxId')}
              placeholder="مثال: 300000000000003"
              className={INPUT_CLASS}
            />
            {form.formState.errors.taxId && (
              <p className="text-label-small text-destructive" role="alert">
                {form.formState.errors.taxId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-companyName" className="text-label-small text-foreground">
              اسم الشركة
            </Label>
            <Input
              id="profile-companyName"
              {...form.register('companyName')}
              placeholder="اسم الشركة أو المؤسسة"
              className={INPUT_CLASS}
            />
            {form.formState.errors.companyName && (
              <p className="text-label-small text-destructive" role="alert">
                {form.formState.errors.companyName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-billingAddress" className="text-label-small text-foreground">
              عنوان الفوترة / الموقع
            </Label>
            <Input
              id="profile-billingAddress"
              {...form.register('billingAddress')}
              placeholder="العنوان أو الموقع الطبيعي للفوترة"
              className={INPUT_CLASS}
            />
            {form.formState.errors.billingAddress && (
              <p className="text-label-small text-destructive" role="alert">
                {form.formState.errors.billingAddress.message}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="h-10 rounded-public-button bg-brand-primary px-5 font-semibold text-[#1A1A1A] shadow-md transition-all hover:bg-brand-primary-hover hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {form.formState.isSubmitting ? (
          <>
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            جاري الحفظ...
          </>
        ) : (
          'حفظ التغييرات'
        )}
      </Button>
    </form>
  )
}
