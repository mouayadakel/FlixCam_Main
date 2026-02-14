'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  APPROVED: 'معتمد',
  SUSPENDED: 'معلق',
  REJECTED: 'مرفوض',
}

interface VendorDetail {
  id: string
  companyName: string
  email: string
  phone: string | null
  status: string
  commissionRate: number
  isNameVisible: boolean
  user: { id: string; name: string | null; email: string }
  equipment: { id: string; sku: string; model: string | null; isActive: boolean }[]
}

export default function VendorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [vendor, setVendor] = useState<VendorDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const id = params?.id as string

  useEffect(() => {
    loadVendor()
  }, [id])

  const loadVendor = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/vendors/${id}`)
      if (!res.ok) throw new Error('Failed to load vendor')
      const data = await res.json()
      setVendor(data)
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل تحميل المورد',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    try {
      const res = await fetch(`/api/admin/vendors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'تم اعتماد المورد' })
      loadVendor()
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const handleSuspend = async () => {
    try {
      const res = await fetch(`/api/admin/vendors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suspend' }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'تم تعليق المورد' })
      loadVendor()
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const handleReactivate = async () => {
    try {
      const res = await fetch(`/api/admin/vendors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate' }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'تم إعادة تفعيل المورد' })
      loadVendor()
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  const handleToggleVisibility = async () => {
    try {
      const res = await fetch(`/api/admin/vendors/${id}/toggle-visibility`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: vendor?.isNameVisible ? 'تم إخفاء الاسم' : 'تم إظهار الاسم' })
      loadVendor()
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    }
  }

  if (loading || !vendor) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/vendors"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للموردين
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{vendor.companyName}</h1>
            <Badge variant={vendor.status === 'APPROVED' ? 'default' : 'secondary'}>
              {STATUS_LABELS[vendor.status] || vendor.status}
            </Badge>
          </div>
          <div className="flex gap-2">
            {vendor.status === 'PENDING' && (
              <Button onClick={handleApprove}>اعتماد</Button>
            )}
            {vendor.status === 'APPROVED' && (
              <Button variant="destructive" onClick={handleSuspend}>
                تعليق
              </Button>
            )}
            {vendor.status === 'SUSPENDED' && (
              <Button onClick={handleReactivate}>إعادة التفعيل</Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>معلومات المورد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">البريد</span>
              <p className="font-medium">{vendor.email}</p>
            </div>
            {vendor.phone && (
              <div>
                <span className="text-sm text-muted-foreground">الهاتف</span>
                <p className="font-medium">{vendor.phone}</p>
              </div>
            )}
            <div>
              <span className="text-sm text-muted-foreground">نسبة العمولة</span>
              <p className="font-medium">{vendor.commissionRate}%</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>إظهار اسم المورد على الموقع</Label>
                <p className="text-xs text-muted-foreground">
                  عند التفعيل، يظهر اسم المورد بجانب المعدات في الموقع العام
                </p>
              </div>
              <div className="flex items-center gap-2">
                {vendor.isNameVisible ? (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Switch
                  checked={vendor.isNameVisible}
                  onCheckedChange={handleToggleVisibility}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>المعدات ({vendor.equipment.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {vendor.equipment.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد معدات</p>
            ) : (
              <ul className="space-y-2">
                {vendor.equipment.slice(0, 10).map((eq) => (
                  <li key={eq.id} className="flex items-center justify-between text-sm">
                    <span>{eq.model || eq.sku}</span>
                    <Badge variant={eq.isActive ? 'default' : 'secondary'}>
                      {eq.isActive ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </li>
                ))}
                {vendor.equipment.length > 10 && (
                  <li className="text-sm text-muted-foreground">
                    +{vendor.equipment.length - 10} المزيد
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
