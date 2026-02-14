/**
 * @file page.tsx
 * @description Technician detail page – wired to GET /api/technicians/[id]
 * @module app/admin/(routes)/technicians/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, User, Mail, Phone, Wrench, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils/format.utils'

interface TechnicianDetail {
  id: string
  name: string
  email?: string
  phone: string | null
  status: string
  createdAt: string
  totalJobs: number
  maintenance: Array<{
    id: string
    maintenanceNumber: string
    type: string
    status: string
    scheduledDate: string
    completedDate: string | null
    equipment: string
  }>
}

const STATUS_LABELS: Record<string, { ar: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { ar: 'نشط', variant: 'default' },
  inactive: { ar: 'غير نشط', variant: 'secondary' },
  'on-leave': { ar: 'إجازة', variant: 'outline' },
}

export default function TechnicianDetailPage() {
  const params = useParams()
  const [tech, setTech] = useState<TechnicianDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = params?.id
    if (!id) return
    setLoading(true)
    setError(null)
    fetch(`/api/technicians/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('فشل تحميل بيانات الفني')
        return r.json()
      })
      .then(setTech)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [params?.id])

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !tech) {
    return (
      <div className="space-y-6" dir="rtl">
        <p className="text-destructive">{error || 'الفني غير موجود'}</p>
        <Button asChild>
          <Link href="/admin/technicians">العودة إلى الفنيين</Link>
        </Button>
      </div>
    )
  }

  const statusConfig = STATUS_LABELS[tech.status] ?? { ar: tech.status, variant: 'outline' as const }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="h-8 w-8" />
            {tech.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={statusConfig.variant}>{statusConfig.ar}</Badge>
            <span className="text-muted-foreground">• إجمالي المهام: {tech.totalJobs}</span>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/technicians">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>معلومات الاتصال</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tech.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                  <p className="font-medium">{tech.email}</p>
                </div>
              </div>
            )}
            {tech.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">الهاتف</p>
                  <p className="font-medium" dir="ltr">{tech.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الانضمام</p>
                <p className="font-medium">{formatDate(tech.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              إحصائيات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tech.totalJobs}</p>
            <p className="text-sm text-muted-foreground">إجمالي مهام الصيانة</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>آخر مهام الصيانة</CardTitle>
          <CardDescription>أحدث 20 مهمة مسندة لهذا الفني</CardDescription>
        </CardHeader>
        <CardContent>
          {tech.maintenance.length === 0 ? (
            <p className="text-muted-foreground py-4">لا توجد مهام صيانة</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>المعدة</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ المقرر</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tech.maintenance.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.maintenanceNumber}</TableCell>
                    <TableCell>{m.equipment}</TableCell>
                    <TableCell>{m.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(m.scheduledDate)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/maintenance/${m.id}`}>عرض</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
