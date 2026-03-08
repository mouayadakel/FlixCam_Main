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

interface EquipmentWithRelations {
  id: string
  sku: string
  model: string | null
  condition: string
  quantityTotal: number
  customFields: unknown
  category: { id: string; name: string }
  brand: { id: string; name: string } | null
}

interface VendorEquipmentEditFormProps {
  equipment: EquipmentWithRelations
}

export function VendorEquipmentEditForm({ equipment }: VendorEquipmentEditFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const customFields = (equipment.customFields as Record<string, unknown>) || {}
  const [form, setForm] = useState({
    model: equipment.model || '',
    condition: equipment.condition as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR',
    boxContents: (customFields.boxContents as string) || '',
    featuredImageUrl: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/vendor/equipment/${equipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: form.model || undefined,
          condition: form.condition,
          boxContents: form.boxContents || undefined,
          featuredImageUrl: form.featuredImageUrl || undefined,
        }),
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
        <Label htmlFor="model">الموديل</Label>
        <Input
          id="model"
          value={form.model}
          onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
        />
      </div>
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
        <Label htmlFor="boxContents">محتويات العلبة</Label>
        <Textarea
          id="boxContents"
          value={form.boxContents}
          onChange={(e) => setForm((p) => ({ ...p, boxContents: e.target.value }))}
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor="featuredImageUrl">رابط صورة جديدة</Label>
        <Input
          id="featuredImageUrl"
          type="url"
          value={form.featuredImageUrl}
          onChange={(e) => setForm((p) => ({ ...p, featuredImageUrl: e.target.value }))}
          placeholder="https://..."
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
        حفظ التغييرات
      </Button>
    </form>
  )
}
