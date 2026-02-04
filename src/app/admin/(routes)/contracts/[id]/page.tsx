/**
 * @file contracts/[id]/page.tsx
 * @description Contract detail page with signature status
 * @module app/admin/(routes)/contracts/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowRight, 
  FileText, 
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Send,
  Pen,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils/format.utils'

interface Contract {
  id: string
  bookingId: string
  termsVersion: string
  signedAt?: string | null
  signedBy?: string | null
  signatureData?: string | null
  status: 'draft' | 'pending_signature' | 'signed' | 'expired' | 'cancelled'
  booking?: {
    id: string
    bookingNumber: string
    customerId: string
    startDate: string
    endDate: string
    customer?: {
      id: string
      name: string | null
      email: string
      phone?: string | null
    }
  } | null
  createdAt: string
  updatedAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-800', icon: FileText },
  pending_signature: { label: 'في انتظار التوقيع', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  signed: { label: 'موقّع', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  expired: { label: 'منتهي', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
}

export default function ContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (params?.id) {
      loadContract()
    }
  }, [params?.id])

  const loadContract = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/contracts/${params?.id}`)
      if (!response.ok) {
        throw new Error('فشل تحميل العقد')
      }
      const data = await response.json()
      setContract(data.data || data)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل العقد',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendForSignature = async () => {
    setSending(true)
    try {
      const response = await fetch(`/api/contracts/${params?.id}/send`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('فشل إرسال العقد')
      }

      toast({
        title: 'تم الإرسال',
        description: 'تم إرسال العقد للعميل للتوقيع',
      })

      loadContract()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إرسال العقد',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/contracts/${params?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('فشل تحديث الحالة')
      }

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث حالة العقد',
      })

      loadContract()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحديث الحالة',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="text-center py-12" dir="rtl">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium">العقد غير موجود</p>
        <Button asChild className="mt-4">
          <Link href="/admin/contracts">العودة إلى العقود</Link>
        </Button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft
  const StatusIcon = statusConfig.icon

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8" />
            عقد الإيجار
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 ml-1" />
              {statusConfig.label}
            </Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">الإصدار: {contract.termsVersion}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/contracts">
              <ArrowRight className="h-4 w-4 ml-2" />
              العودة
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 ml-2" />
            تحميل PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Signature Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pen className="h-5 w-5" />
                حالة التوقيع
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contract.signedAt ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-bold text-green-800">تم التوقيع</p>
                      <p className="text-sm text-green-700">
                        بتاريخ: {formatDate(contract.signedAt)}
                      </p>
                      {contract.signedBy && (
                        <p className="text-sm text-green-700">
                          بواسطة: {contract.signedBy}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-yellow-600" />
                    <div>
                      <p className="font-bold text-yellow-800">في انتظار التوقيع</p>
                      <p className="text-sm text-yellow-700">
                        لم يتم توقيع العقد بعد
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Info */}
          {contract.booking && (
            <Card>
              <CardHeader>
                <CardTitle>معلومات الحجز</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الحجز</p>
                    <Link 
                      href={`/admin/bookings/${contract.booking.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {contract.booking.bookingNumber}
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">العميل</p>
                    {contract.booking.customer && (
                      <Link 
                        href={`/admin/clients/${contract.booking.customer.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {contract.booking.customer.name || contract.booking.customer.email}
                      </Link>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ البداية</p>
                    <p className="font-medium">{formatDate(contract.booking.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ النهاية</p>
                    <p className="font-medium">{formatDate(contract.booking.endDate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contract Preview Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>محتوى العقد</CardTitle>
              <CardDescription>معاينة شروط وأحكام العقد</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-6 min-h-[300px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">معاينة العقد</p>
                  <p className="text-sm">سيتم عرض محتوى العقد هنا</p>
                  <Button variant="outline" className="mt-4">
                    <Download className="h-4 w-4 ml-2" />
                    تحميل النسخة الكاملة
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>الإجراءات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contract.status === 'draft' && (
                <Button className="w-full" onClick={handleSendForSignature} disabled={sending}>
                  <Send className="h-4 w-4 ml-2" />
                  {sending ? 'جاري الإرسال...' : 'إرسال للتوقيع'}
                </Button>
              )}
              {contract.status === 'pending_signature' && (
                <>
                  <Button className="w-full" variant="outline" onClick={handleSendForSignature} disabled={sending}>
                    <RefreshCw className="h-4 w-4 ml-2" />
                    إعادة الإرسال
                  </Button>
                  <Button className="w-full" onClick={() => handleStatusChange('signed')}>
                    <CheckCircle className="h-4 w-4 ml-2" />
                    تحديد كموقّع
                  </Button>
                </>
              )}
              {contract.status !== 'cancelled' && contract.status !== 'signed' && (
                <Button className="w-full" variant="outline" onClick={() => handleStatusChange('cancelled')}>
                  <AlertCircle className="h-4 w-4 ml-2" />
                  إلغاء العقد
                </Button>
              )}
              <Button className="w-full" variant="outline">
                <Download className="h-4 w-4 ml-2" />
                تحميل PDF
              </Button>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>التفاصيل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
                <p className="font-medium">{formatDate(contract.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">آخر تحديث</p>
                <p className="font-medium">{formatDate(contract.updatedAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إصدار الشروط</p>
                <p className="font-medium">{contract.termsVersion}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
