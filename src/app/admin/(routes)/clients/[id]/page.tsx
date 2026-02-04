/**
 * @file clients/[id]/page.tsx
 * @description Client detail page with booking history and statistics
 * @module app/admin/(routes)/clients/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowRight, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  DollarSign,
  Package,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  FileText,
  CreditCard,
  ShieldCheck,
  ShieldX,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'

interface Client {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: string
  status: 'active' | 'suspended' | 'inactive'
  address?: string | null
  city?: string | null
  nationalId?: string | null
  companyName?: string | null
  taxNumber?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    bookings: number
  }
  bookings?: Array<{
    id: string
    bookingNumber: string
    status: string
    startDate: string
    endDate: string
    totalAmount: number
    createdAt: string
  }>
  payments?: Array<{
    id: string
    amount: number
    status: string
    createdAt: string
  }>
}

interface ClientStats {
  totalBookings: number
  totalSpent: number
  activeBookings: number
  lastBookingDate: string | null
  averageBookingValue: number
}

interface VerificationDoc {
  id: string
  userId: string
  documentType: string
  fileUrl: string
  filename: string | null
  status: string
  reviewedAt: string | null
  rejectionReason: string | null
  createdAt: string
}

interface VerificationData {
  verificationStatus: string
  user: { id: string; name: string | null; email: string }
  documents: VerificationDoc[]
}

const STATUS_CONFIG = {
  active: { label: 'نشط', color: 'bg-green-100 text-green-800' },
  suspended: { label: 'معلق', color: 'bg-red-100 text-red-800' },
  inactive: { label: 'غير نشط', color: 'bg-gray-100 text-gray-800' },
}

const BOOKING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'مسودة', color: 'bg-gray-100 text-gray-800' },
  RISK_CHECK: { label: 'فحص المخاطر', color: 'bg-yellow-100 text-yellow-800' },
  PAYMENT_PENDING: { label: 'انتظار الدفع', color: 'bg-orange-100 text-orange-800' },
  CONFIRMED: { label: 'مؤكد', color: 'bg-blue-100 text-blue-800' },
  ACTIVE: { label: 'نشط', color: 'bg-green-100 text-green-800' },
  RETURNED: { label: 'مرتجع', color: 'bg-purple-100 text-purple-800' },
  CLOSED: { label: 'مغلق', color: 'bg-gray-100 text-gray-800' },
  CANCELLED: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [client, setClient] = useState<Client | null>(null)
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [verification, setVerification] = useState<VerificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [verificationLoading, setVerificationLoading] = useState(false)

  useEffect(() => {
    if (params?.id) {
      loadClient()
    }
  }, [params?.id])

  const loadClient = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/clients/${params?.id}`)
      if (!response.ok) {
        throw new Error('فشل تحميل بيانات العميل')
      }
      const data = await response.json()
      setClient(data.data || data)
      
      // Calculate stats
      const bookings = data.data?.bookings || data.bookings || []
      const payments = data.data?.payments || data.payments || []
      
      const totalSpent = payments
        .filter((p: any) => p.status === 'SUCCESS')
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0)
      
      const activeBookings = bookings.filter((b: any) => 
        ['CONFIRMED', 'ACTIVE'].includes(b.status)
      ).length
      
      const lastBooking = bookings.length > 0 
        ? bookings.sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0]
        : null

      setStats({
        totalBookings: bookings.length,
        totalSpent,
        activeBookings,
        lastBookingDate: lastBooking?.createdAt || null,
        averageBookingValue: bookings.length > 0 ? totalSpent / bookings.length : 0,
      })
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل بيانات العميل',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadVerification = async () => {
    if (!params?.id) return
    setVerificationLoading(true)
    try {
      const res = await fetch(`/api/clients/${params.id}/verification`)
      if (!res.ok) throw new Error('Failed to load verification')
      const data = await res.json()
      setVerification(data)
    } catch {
      toast({ title: 'Error', description: 'Failed to load verification', variant: 'destructive' })
    } finally {
      setVerificationLoading(false)
    }
  }

  const handleVerificationStatusChange = async (status: 'VERIFIED' | 'REJECTED' | 'PENDING' | 'UNVERIFIED') => {
    if (!params?.id) return
    try {
      const res = await fetch(`/api/clients/${params.id}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationStatus: status }),
      })
      if (!res.ok) throw new Error('Failed to update')
      toast({ title: 'Success', description: 'Verification status updated' })
      loadVerification()
    } catch {
      toast({ title: 'Error', description: 'Failed to update verification status', variant: 'destructive' })
    }
  }

  const handleDocumentReview = async (docId: string, status: 'approved' | 'rejected', rejectionReason?: string) => {
    try {
      const res = await fetch(`/api/verification-documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason: rejectionReason || null }),
      })
      if (!res.ok) throw new Error('Failed to update document')
      toast({ title: 'Success', description: `Document ${status}` })
      loadVerification()
    } catch {
      toast({ title: 'Error', description: 'Failed to update document', variant: 'destructive' })
    }
  }

  const handleStatusChange = async (newStatus: 'active' | 'suspended' | 'inactive') => {
    try {
      const response = await fetch(`/api/clients/${params?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('فشل تحديث الحالة')
      }

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث حالة العميل بنجاح',
      })

      loadClient()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحديث الحالة',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/clients/${params?.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('فشل حذف العميل')
      }

      toast({
        title: 'تم الحذف',
        description: 'تم حذف العميل بنجاح',
      })

      router.push('/admin/clients')
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل حذف العميل',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12" dir="rtl">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium">العميل غير موجود</p>
        <Button asChild className="mt-4">
          <Link href="/admin/clients">العودة إلى العملاء</Link>
        </Button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[client.status] || STATUS_CONFIG.active

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="h-8 w-8" />
            {client.name || client.email}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">عميل منذ {formatDate(client.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/clients">
              <ArrowRight className="h-4 w-4 ml-2" />
              العودة
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/clients/${client.id}/edit`}>
              <Edit className="h-4 w-4 ml-2" />
              تعديل
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="h-4 w-4 ml-2" />
                حذف
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                <AlertDialogDescription>
                  سيتم حذف العميل نهائياً. هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  حذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الحجوزات</p>
                <p className="text-2xl font-bold">{stats?.totalBookings || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الإنفاق</p>
                <p className="text-2xl font-bold">{formatCurrency(stats?.totalSpent || 0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">حجوزات نشطة</p>
                <p className="text-2xl font-bold">{stats?.activeBookings || 0}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متوسط قيمة الحجز</p>
                <p className="text-2xl font-bold">{formatCurrency(stats?.averageBookingValue || 0)}</p>
              </div>
              <CreditCard className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">المعلومات</TabsTrigger>
          <TabsTrigger value="bookings">الحجوزات ({client.bookings?.length || 0})</TabsTrigger>
          <TabsTrigger value="payments">المدفوعات</TabsTrigger>
          <TabsTrigger value="verification" onClick={() => !verification && loadVerification()}>التحقق</TabsTrigger>
          <TabsTrigger value="actions">الإجراءات</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>معلومات الاتصال</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">الهاتف</p>
                      <p className="font-medium" dir="ltr">{client.phone}</p>
                    </div>
                  </div>
                )}
                {(client.address || client.city) && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">العنوان</p>
                      <p className="font-medium">{[client.address, client.city].filter(Boolean).join(', ')}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>معلومات إضافية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.nationalId && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">رقم الهوية</p>
                      <p className="font-medium">{client.nationalId}</p>
                    </div>
                  </div>
                )}
                {client.companyName && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">اسم الشركة</p>
                      <p className="font-medium">{client.companyName}</p>
                    </div>
                  </div>
                )}
                {client.taxNumber && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">الرقم الضريبي</p>
                      <p className="font-medium">{client.taxNumber}</p>
                    </div>
                  </div>
                )}
                {client.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">ملاحظات</p>
                    <p className="text-sm bg-muted p-3 rounded-lg">{client.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>سجل الحجوزات</CardTitle>
                <Button asChild>
                  <Link href={`/admin/bookings/new?customerId=${client.id}`}>
                    حجز جديد
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!client.bookings || client.bookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد حجوزات</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الحجز</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>تاريخ البداية</TableHead>
                      <TableHead>تاريخ النهاية</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.bookings.map((booking) => {
                      const statusConf = BOOKING_STATUS_CONFIG[booking.status] || { label: booking.status, color: 'bg-gray-100' }
                      return (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono">{booking.bookingNumber}</TableCell>
                          <TableCell>
                            <Badge className={statusConf.color}>{statusConf.label}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(booking.startDate)}</TableCell>
                          <TableCell>{formatDate(booking.endDate)}</TableCell>
                          <TableCell>{formatCurrency(booking.totalAmount)}</TableCell>
                          <TableCell>
                            <Link href={`/admin/bookings/${booking.id}`}>
                              <Button size="sm" variant="ghost">عرض</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                التحقق من الهوية
              </CardTitle>
              <CardDescription>حالة التحقق ومستندات العميل. وافق أو ارفض المستندات أو الحالة الإجمالية.</CardDescription>
            </CardHeader>
            <CardContent>
              {verificationLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : verification ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={
                      verification.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                      verification.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      verification.verificationStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                    }>
                      {verification.verificationStatus}
                    </Badge>
                    {verification.verificationStatus !== 'VERIFIED' && (
                      <Button size="sm" variant="outline" onClick={() => handleVerificationStatusChange('VERIFIED')}>
                        <CheckCircle className="h-4 w-4 mr-1" /> اعتماد
                      </Button>
                    )}
                    {verification.verificationStatus !== 'REJECTED' && (
                      <Button size="sm" variant="outline" onClick={() => handleVerificationStatusChange('REJECTED')}>
                        <ShieldX className="h-4 w-4 mr-1" /> رفض
                      </Button>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">المستندات</h4>
                    {verification.documents.length === 0 ? (
                      <p className="text-muted-foreground text-sm">لا توجد مستندات مرفوعة. استخدم واجهة رفع الملفات ثم أضف الرابط هنا أو أضف مستنداً عبر API.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>النوع</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {verification.documents.map((doc) => (
                            <TableRow key={doc.id}>
                              <TableCell>{doc.documentType}</TableCell>
                              <TableCell>
                                <Badge variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary'}>
                                  {doc.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(doc.createdAt)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="ghost" asChild>
                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                  {doc.status === 'pending' && (
                                    <>
                                      <Button size="sm" variant="outline" onClick={() => handleDocumentReview(doc.id, 'approved')}>اعتماد</Button>
                                      <Button size="sm" variant="outline" onClick={() => handleDocumentReview(doc.id, 'rejected')}>رفض</Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">اختر تبويب التحقق لتحميل البيانات.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>سجل المدفوعات</CardTitle>
            </CardHeader>
            <CardContent>
              {!client.payments || client.payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد مدفوعات</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === 'SUCCESS' ? 'default' : 'secondary'}>
                            {payment.status === 'SUCCESS' ? 'ناجح' : payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(payment.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>إجراءات سريعة</CardTitle>
              <CardDescription>إدارة حالة العميل والإجراءات المتاحة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {client.status !== 'active' && (
                  <Button onClick={() => handleStatusChange('active')}>
                    <CheckCircle className="h-4 w-4 ml-2" />
                    تفعيل العميل
                  </Button>
                )}
                {client.status !== 'suspended' && (
                  <Button variant="outline" onClick={() => handleStatusChange('suspended')}>
                    <AlertCircle className="h-4 w-4 ml-2" />
                    تعليق العميل
                  </Button>
                )}
                {client.status !== 'inactive' && (
                  <Button variant="outline" onClick={() => handleStatusChange('inactive')}>
                    <Clock className="h-4 w-4 ml-2" />
                    إلغاء التفعيل
                  </Button>
                )}
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-2">إجراءات أخرى</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/admin/bookings/new?customerId=${client.id}`}>
                      <Calendar className="h-4 w-4 ml-2" />
                      إنشاء حجز
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/admin/quotes/new?customerId=${client.id}`}>
                      <FileText className="h-4 w-4 ml-2" />
                      إنشاء عرض سعر
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
