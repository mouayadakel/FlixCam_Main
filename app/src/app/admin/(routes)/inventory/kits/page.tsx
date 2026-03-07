/**
 * @file page.tsx
 * @description Equipment kits (bundles) list with filters
 * @module app/admin/(routes)/inventory/kits
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Eye, RefreshCw, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'

interface KitItem {
  equipmentId: string
  quantity: number
  equipment: { id: string; sku: string; model: string | null; dailyPrice: string }
  dailyPrice: string
}

interface Kit {
  id: string
  name: string
  slug: string
  description: string | null
  discountPercent: string | null
  isActive: boolean
  items: KitItem[]
  totalDailyRate: number
  finalDailyRate: number
  createdAt: string
  updatedAt: string
}

export default function KitsPage() {
  const { toast } = useToast()
  const [kits, setKits] = useState<Kit[]>([])
  const [loading, setLoading] = useState(true)
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all')

  useEffect(() => {
    loadKits()
  }, [isActiveFilter])

  const loadKits = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isActiveFilter === 'true' || isActiveFilter === 'false') {
        params.set('isActive', isActiveFilter)
      }
      const res = await fetch(`/api/kits?${params.toString()}`)
      if (!res.ok) throw new Error('فشل تحميل الحزم')
      const data = await res.json()
      setKits(data.kits ?? [])
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل الحزم',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">الحزم والمجموعات</h1>
          <p className="mt-1 text-muted-foreground">مجموعات معدات مع خصم اختياري</p>
        </div>
        <Button asChild>
          <Link href="/admin/inventory/kits/new">
            <Plus className="ms-2 h-4 w-4" />
            حزمة جديدة
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="true">نشط</SelectItem>
            <SelectItem value="false">غير نشط</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={loadKits} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الرابط (slug)</TableHead>
              <TableHead>الخصم</TableHead>
              <TableHead>السعر اليومي (قبل)</TableHead>
              <TableHead>السعر اليومي (بعد)</TableHead>
              <TableHead>عدد القطع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ التحديث</TableHead>
              <TableHead className="text-end">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                </TableRow>
              ))
            ) : kits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center">
                  <Package className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    لا توجد حزم. أنشئ حزمة جديدة لربط معدات مع خصم.
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/admin/inventory/kits/new">حزمة جديدة</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              kits.map((kit) => (
                <TableRow key={kit.id}>
                  <TableCell className="font-medium">{kit.name}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{kit.slug}</TableCell>
                  <TableCell>{kit.discountPercent ? `${kit.discountPercent}%` : '—'}</TableCell>
                  <TableCell>{formatCurrency(kit.totalDailyRate)}</TableCell>
                  <TableCell>{formatCurrency(kit.finalDailyRate)}</TableCell>
                  <TableCell>{kit.items.reduce((s, i) => s + i.quantity, 0)}</TableCell>
                  <TableCell>
                    <Badge variant={kit.isActive ? 'default' : 'secondary'}>
                      {kit.isActive ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(kit.updatedAt)}</TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/inventory/kits/${kit.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
