'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function NewVendorPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    companyName: '',
    companyNameAr: '',
    description: '',
    commercialReg: '',
    vatNumber: '',
    bankName: '',
    iban: '',
    commissionRate: 15,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password || !form.companyName) {
      toast({
        title: 'خطأ',
        description: 'البريد وكلمة المرور واسم الشركة مطلوبة',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || err.error || 'Failed to create')
      }

      const vendor = await res.json()
      toast({ title: 'تم إنشاء المورد' })
      router.push(`/admin/vendors/${vendor.id}`)
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل في الإنشاء',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/vendors"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للموردين
        </Link>
        <h1 className="text-2xl font-bold">إضافة مورد جديد</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات المورد</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>البريد الإلكتروني *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>كلمة المرور *</Label>
                <PasswordInput
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>الاسم</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>الهاتف</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>اسم الشركة *</Label>
                <Input
                  value={form.companyName}
                  onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>اسم الشركة (إنجليزي)</Label>
                <Input
                  value={form.companyNameAr}
                  onChange={(e) => setForm((p) => ({ ...p, companyNameAr: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>نسبة العمولة %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.commissionRate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, commissionRate: parseFloat(e.target.value) || 15 }))
                }
              />
            </div>
            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
                إنشاء المورد
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                إلغاء
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
