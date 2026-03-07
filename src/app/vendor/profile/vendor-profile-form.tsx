'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface VendorProfileFormProps {
  vendor: {
    id: string
    companyName: string
    companyNameAr: string
    description: string
    phone: string
    bankName: string
    iban: string
  }
}

export function VendorProfileForm({ vendor }: VendorProfileFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    companyName: vendor.companyName,
    companyNameAr: vendor.companyNameAr,
    description: vendor.description,
    phone: vendor.phone,
    bankName: vendor.bankName,
    iban: vendor.iban,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/vendor/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || err.error || 'Failed to update')
      }

      toast({ title: 'تم التحديث' })
      router.refresh()
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل في التحديث',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="companyName">اسم الشركة (عربي)</Label>
        <Input
          id="companyName"
          value={form.companyName}
          onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
          required
        />
      </div>
      <div>
        <Label htmlFor="companyNameAr">اسم الشركة (إنجليزي)</Label>
        <Input
          id="companyNameAr"
          value={form.companyNameAr}
          onChange={(e) => setForm((p) => ({ ...p, companyNameAr: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="description">الوصف</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor="phone">الهاتف</Label>
        <Input
          id="phone"
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="bankName">اسم البنك</Label>
        <Input
          id="bankName"
          value={form.bankName}
          onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="iban">رقم الآيبان</Label>
        <Input
          id="iban"
          value={form.iban}
          onChange={(e) => setForm((p) => ({ ...p, iban: e.target.value }))}
          placeholder="SA..."
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
        حفظ
      </Button>
    </form>
  )
}
