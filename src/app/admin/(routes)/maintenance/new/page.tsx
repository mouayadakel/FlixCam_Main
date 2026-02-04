/**
 * @file maintenance/new/page.tsx
 * @description Create new maintenance request page
 * @module app/admin/(routes)/maintenance/new
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Plus, Wrench } from 'lucide-react'
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

interface Equipment {
  id: string
  sku: string
  model: string | null
}

interface User {
  id: string
  name: string | null
  email: string
}

export default function NewMaintenancePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [technicians, setTechnicians] = useState<User[]>([])
  
  const [formData, setFormData] = useState({
    equipmentId: searchParams?.get('equipmentId') || '',
    type: 'preventive',
    priority: 'medium',
    scheduledDate: '',
    technicianId: '',
    description: '',
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [equipmentRes, usersRes] = await Promise.all([
        fetch('/api/equipment?limit=100'),
        fetch('/api/users?role=TECHNICIAN'),
      ])

      if (equipmentRes.ok) {
        const data = await equipmentRes.json()
        setEquipment(data.items || [])
      }

      if (usersRes.ok) {
        const data = await usersRes.json()
        setTechnicians(data.data || data.users || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.equipmentId) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار المعدات',
        variant: 'destructive',
      })
      return
    }

    if (!formData.scheduledDate) {
      toast({
        title: 'خطأ',
        description: 'يرجى تحديد التاريخ المقرر',
        variant: 'destructive',
      })
      return
    }

    if (!formData.description) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال وصف العمل المطلوب',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          technicianId: formData.technicianId || null,
          notes: formData.notes || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'فشل إنشاء طلب الصيانة')
      }

      const maintenance = await response.json()

      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء طلب الصيانة بنجاح',
      })

      router.push(`/admin/maintenance/${maintenance.id || maintenance.data?.id}`)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إنشاء طلب الصيانة',
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            طلب صيانة جديد
          </h1>
          </div>
        <Button variant="outline" asChild>
          <Link href="/admin/maintenance">
            <ArrowRight className="h-4 w-4 ml-2" />
            إلغاء
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Equipment Selection */}
        <Card>
          <CardHeader>
            <CardTitle>المعدات</CardTitle>
            <CardDescription>اختر المعدات التي تحتاج صيانة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>المعدات *</Label>
              <Select
                value={formData.equipmentId}
                onValueChange={(value) => setFormData({ ...formData, equipmentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المعدات" />
                </SelectTrigger>
                <SelectContent>
                  {equipment.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.sku} {eq.model && `- ${eq.model}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Details */}
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الصيانة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>نوع الصيانة</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">وقائي</SelectItem>
                    <SelectItem value="corrective">تصحيحي</SelectItem>
                    <SelectItem value="inspection">فحص</SelectItem>
                    <SelectItem value="repair">إصلاح</SelectItem>
                    <SelectItem value="calibration">معايرة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الأولوية</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة</SelectItem>
                    <SelectItem value="medium">متوسطة</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="urgent">عاجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>التاريخ المقرر *</Label>
                <Input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>الفني المسؤول (اختياري)</Label>
              <Select
                value={formData.technicianId}
                onValueChange={(value) => setFormData({ ...formData, technicianId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفني" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">غير محدد</SelectItem>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name || tech.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>وصف العمل المطلوب *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="اوصف المشكلة أو العمل المطلوب..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>ملاحظات إضافية</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/maintenance">إلغاء</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 ml-2" />
                إنشاء طلب الصيانة
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
