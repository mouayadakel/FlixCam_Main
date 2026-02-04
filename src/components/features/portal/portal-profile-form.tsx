'use client'

/**
 * Portal profile form - name, phone (email read-only). Phase 4.4.
 */

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const profileSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب').max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
})

type ProfileFormData = z.infer<typeof profileSchema>

export function PortalProfileForm() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string>('')

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', phone: '' },
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="profile-name">الاسم</Label>
        <Input
          id="profile-name"
          {...form.register('name')}
          placeholder="الاسم الكامل"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-email">البريد الإلكتروني</Label>
        <Input
          id="profile-email"
          type="email"
          value={email}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">لا يمكن تغيير البريد من هنا</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-phone">رقم الهاتف</Label>
        <Input
          id="profile-phone"
          {...form.register('phone')}
          placeholder="+966..."
        />
        {form.formState.errors.phone && (
          <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
        )}
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            جاري الحفظ...
          </>
        ) : (
          'حفظ التغييرات'
        )}
      </Button>
    </form>
  )
}
