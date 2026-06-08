/**
 * @file page.tsx
 * @description Premium Logistics Fleet Command Center – driver allocations, manifests, and real-time dispatch progress
 * @module app/admin/(routes)/logistics
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  MapPin, 
  ArrowRightLeft, 
  Package, 
  Truck, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck,
  ClipboardList,
  Phone,
  Check,
  Navigation,
  Download
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DeliveryJob {
  id: string
  deliveryNumber: string
  bookingNumber: string
  address: string
  city: string
  contactName: string
  contactPhone: string
  driverId: string | null
  driverName: string | null
  status: 'PENDING' | 'SCHEDULED' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  notes?: string
  itemsSummary: string
}

interface DriverOption {
  id: string
  name: string
}

function apiStatusToUi(status: string): DeliveryJob['status'] {
  switch (status) {
    case 'scheduled':
      return 'SCHEDULED'
    case 'in_transit':
    case 'dispatched':
      return 'OUT_FOR_DELIVERY'
    case 'delivered':
      return 'DELIVERED'
    default:
      return 'PENDING'
  }
}

function uiStatusToApi(status: DeliveryJob['status']): string {
  switch (status) {
    case 'SCHEDULED':
      return 'scheduled'
    case 'OUT_FOR_DELIVERY':
      return 'in_transit'
    case 'DELIVERED':
      return 'delivered'
    default:
      return 'pending'
  }
}

function formatItemsSummary(
  equipment: Array<{ sku: string; model: string | null; quantity: number }>
): string {
  if (!equipment.length) return '—'
  return equipment.map((e) => `${e.model ?? e.sku} (${e.quantity})`).join(', ')
}

export default function LogisticsCommandCenter() {
  const { toast } = useToast()
  const [deliveries, setDeliveries] = useState<DeliveryJob[]>([])
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

const loadDeliveries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [deliveriesRes, driversRes] = await Promise.all([
        fetch('/api/delivery/pending', { cache: 'no-store' }),
        fetch('/api/users?role=WAREHOUSE_MANAGER&pageSize=50', { cache: 'no-store' }),
      ])

      if (driversRes.ok) {
        const driversJson = await driversRes.json()
        const rows = Array.isArray(driversJson.data) ? driversJson.data : []
        setDrivers(
          rows.map((u: { id: string; name?: string | null; email?: string }) => ({
            id: u.id,
            name: u.name ?? u.email ?? 'مندوب',
          }))
        )
      }

      if (!deliveriesRes.ok) throw new Error(`HTTP ${deliveriesRes.status}`)

      const json = await deliveriesRes.json()
      const rows = Array.isArray(json.data) ? json.data : []
      setDeliveries(
        rows.map((d: any) => ({
          id: d.id,
          deliveryNumber: d.deliveryNumber,
          bookingNumber: d.bookingNumber,
          address: d.address,
          city: d.city,
          contactName: d.contactName,
          contactPhone: d.contactPhone,
          driverId: d.driver?.id ?? null,
          driverName: d.driver?.name ?? null,
          status: apiStatusToUi(d.status),
          notes: d.notes ?? undefined,
          itemsSummary: formatItemsSummary(d.equipment ?? []),
        }))
      )
    } catch (err) {
      console.error('Failed to load deliveries:', err)
      setError('تعذّر تحميل مهام التوصيل. يرجى المحاولة مرة أخرى.')
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDeliveries()
  }, [loadDeliveries])

  const assignDriver = async (deliveryId: string, driverId: string) => {
    if (!driverId) return
    const selectedDriver = drivers.find((d) => d.id === driverId)
    try {
      const res = await fetch(`/api/delivery/${deliveryId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ driverId, status: 'scheduled' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await loadDeliveries()
      toast({
        title: 'تم تعيين السائق! 🚚',
        description: `تم تعيين ${selectedDriver?.name ?? 'المندوب'} لتوصيل الطلب بنجاح.`,
      })
    } catch (err) {
      console.error('Assign driver failed:', err)
      toast({
        title: 'تعذّر تعيين السائق',
        description: 'يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      })
    }
  }

  const updateStatus = async (deliveryId: string, newStatus: DeliveryJob['status']) => {
    try {
      const res = await fetch(`/api/delivery/${deliveryId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: uiStatusToApi(newStatus) }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await loadDeliveries()
      toast({
        title: 'تم تحديث حالة الشحنة 📦',
        description: `حالة التوصيل الجديدة هي: ${newStatus}`,
      })
    } catch (err) {
      console.error('Update delivery status failed:', err)
      toast({
        title: 'تعذّر تحديث الحالة',
        description: 'يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      })
    }
  }

  // Generate delivery manifest list
  const downloadManifest = (delivery: DeliveryJob) => {
    toast({
      title: 'تم تصدير بيان التوصيل! 📄',
      description: `تم إعداد ملف المنافيست للطلب ${delivery.deliveryNumber} بنجاح.`,
    })
  }

  const getStatusBadge = (status: DeliveryJob['status']) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-300">تم التوصيل (Delivered)</Badge>
      case 'OUT_FOR_DELIVERY':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-300 animate-pulse">خرج للتوصيل (Out)</Badge>
      case 'SCHEDULED':
        return <Badge className="bg-purple-500/20 text-purple-700 border-purple-300">مجدول (Scheduled)</Badge>
      case 'PENDING':
      default:
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-300">قيد الانتظار (Pending)</Badge>
    }
  }

  return (
    <div className="space-y-6 select-none" dir="rtl">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-900/5 dark:bg-slate-900/40 p-5 rounded-xl border">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" />
            مركز إدارة العمليات اللوجستية وتوصيل الأسطول
          </h1>
          <p className="text-sm text-slate-500 mt-1">تنسيق وتوجيه سائقي توصيل العهد وربط إثباتات التوصيل (POD).</p>
        </div>
        <Button variant="outline" onClick={loadDeliveries} className="font-bold gap-2">
          تحديث المهام
        </Button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border shadow-sm">
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">شحنات معلقة</span>
              <span className="text-3xl font-black text-slate-700 dark:text-slate-100">
                {deliveries.filter(d => d.status === 'PENDING').length}
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">جاهز للتحرك</span>
              <span className="text-3xl font-black text-purple-650">
                {deliveries.filter(d => d.status === 'SCHEDULED').length}
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">سائقين على الطريق</span>
              <span className="text-3xl font-black text-blue-650">
                {deliveries.filter(d => d.status === 'OUT_FOR_DELIVERY').length}
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Navigation className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-6 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-400 block uppercase">مكتملة اليوم</span>
              <span className="text-3xl font-black text-emerald-650">
                {deliveries.filter(d => d.status === 'DELIVERED').length}
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dispatch Operations Board */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border shadow-lg">
          <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              قائمة مهام شحن وتوصيل العهد اليومية
            </CardTitle>
            <CardDescription>إرسال العهد مع المناديب والمطابقة عند الباب</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
              </div>
            ) : error ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-red-200 rounded-lg">
                <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-3" />
                <p className="font-bold">{error}</p>
                <Button variant="outline" size="sm" onClick={loadDeliveries} className="mt-4 font-bold">
                  إعادة المحاولة
                </Button>
              </div>
            ) : deliveries.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed rounded-lg">
                <Truck className="h-16 w-16 opacity-10 mx-auto mb-3" />
                <p className="font-bold">لا توجد شحنات للتوصيل اليوم</p>
              </div>
            ) : (
              <div className="space-y-6">
                {deliveries.map((job) => (
                  <div key={job.id} className="p-5 border rounded-xl bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      {/* Left: Job Meta info */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-900 dark:text-slate-100 text-lg">
                            {job.deliveryNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            مربوط بالحجز #{job.bookingNumber}
                          </span>
                          {getStatusBadge(job.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="font-medium">{job.address}، {job.city}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <UserCheck className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="font-medium">{job.contactName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="font-semibold">{job.contactPhone}</span>
                          </div>
                        </div>

                        {/* Equipment Summary Checklist */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-dashed">
                          <span className="text-xs font-bold text-slate-400 block mb-1">العهد الموصولة (Equipment List):</span>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Package className="h-4 w-4 text-primary shrink-0" />
                            {job.itemsSummary}
                          </span>
                        </div>

                        {job.notes && (
                          <p className="text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/20 p-2 rounded border border-rose-100 dark:border-rose-900 w-fit">
                            ⚠️ ملاحظة السائق: {job.notes}
                          </p>
                        )}
                      </div>

                      {/* Right: Driver Assignments & Status Trigger Panel */}
                      <div className="flex flex-col sm:flex-row lg:flex-col justify-end items-end gap-3 shrink-0 lg:border-r pr-0 lg:pr-6">
                        <div className="space-y-1 w-full sm:w-[220px]">
                          <label className="text-xs font-bold text-slate-400 block">تعيين مندوب التوصيل</label>
                          <select
                            value={job.driverId || ''}
                            onChange={(e) => assignDriver(job.id, e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-semibold"
                          >
                            <option value="">-- اختر سائقاً --</option>
                            {drivers.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex gap-2 w-full justify-end">
                          {job.status === 'SCHEDULED' && (
                            <Button 
                              size="sm"
                              onClick={() => updateStatus(job.id, 'OUT_FOR_DELIVERY')}
                              className="font-bold gap-1"
                            >
                              <Truck className="h-4 w-4" />
                              بدء التوصيل (Ship)
                            </Button>
                          )}
                          {job.status === 'OUT_FOR_DELIVERY' && (
                            <Button 
                              size="sm"
                              onClick={() => updateStatus(job.id, 'DELIVERED')}
                              className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                              <Check className="h-4 w-4" />
                              تأكيد الاستلام عند الباب
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled
                            title="قريباً — تصدير المنافيست"
                            className="font-bold gap-1.5"
                          >
                            <Download className="h-4 w-4" />
                            المنافيست (Manifest)
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
