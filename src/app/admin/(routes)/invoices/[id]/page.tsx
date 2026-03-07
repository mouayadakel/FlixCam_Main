/**
 * @file invoices/[id]/page.tsx
 * @description Invoice detail page with payment tracking
 * @module app/admin/(routes)/invoices/[id]
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  FileText,
  DollarSign,
  Calendar,
  User,
  Download,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Printer,
  CreditCard,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'

interface InvoiceItem {
  id?: string
  description: string
  quantity: number
  unitPrice: number
  days?: number
  total: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  bookingId?: string | null
  customerId: string
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled'
  subtotal: number
  vatAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  dueDate: string
  issueDate: string
  notes?: string | null
  customer: {
    id: string
    name: string | null
    email: string
    phone?: string | null
    companyName?: string | null
    taxNumber?: string | null
  }
  booking?: {
    id: string
    bookingNumber: string
  } | null
  items: InvoiceItem[]
  payments: Array<{
    id: string
    amount: number
    method: string
    status: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-800', icon: FileText },
  sent: { label: 'مُرسلة', color: 'bg-blue-100 text-blue-800', icon: Send },
  paid: { label: 'مدفوعة', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  partial: { label: 'مدفوعة جزئياً', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  overdue: { label: 'متأخرة', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  cancelled: { label: 'ملغاة', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'cash',
    reference: '',
  })

  useEffect(() => {
    if (params?.id) {
      loadInvoice()
    }
  }, [params?.id])

  const loadInvoice = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/invoices/${params?.id}`)
      if (!response.ok) {
        throw new Error('فشل تحميل الفاتورة')
      }
      const data = await response.json()
      setInvoice(data.data || data)
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل الفاتورة',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/invoices/${params?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('فشل تحديث الحالة')
      }

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث حالة الفاتورة',
      })

      loadInvoice()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحديث الحالة',
        variant: 'destructive',
      })
    }
  }

  const handleRecordPayment = async () => {
    if (!paymentData.amount || Number(paymentData.amount) <= 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال مبلغ صحيح',
        variant: 'destructive',
      })
      return
    }

    setRecordingPayment(true)
    try {
      const response = await fetch(`/api/invoices/${params?.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(paymentData.amount),
          method: paymentData.method,
          reference: paymentData.reference,
        }),
      })

      if (!response.ok) {
        throw new Error('فشل تسجيل الدفعة')
      }

      toast({
        title: 'تم التسجيل',
        description: 'تم تسجيل الدفعة بنجاح',
      })

      setPaymentDialogOpen(false)
      setPaymentData({ amount: '', method: 'cash', reference: '' })
      loadInvoice()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تسجيل الدفعة',
        variant: 'destructive',
      })
    } finally {
      setRecordingPayment(false)
    }
  }

  const handleSendInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params?.id}/send`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('فشل إرسال الفاتورة')
      }

      toast({
        title: 'تم الإرسال',
        description: 'تم إرسال الفاتورة للعميل',
      })

      loadInvoice()
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل إرسال الفاتورة',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="py-12 text-center" dir="rtl">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">الفاتورة غير موجودة</p>
        <Button asChild className="mt-4">
          <Link href="/admin/invoices">العودة إلى الفواتير</Link>
        </Button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft
  const StatusIcon = statusConfig.icon
  const remainingAmount = invoice.totalAmount - invoice.paidAmount
  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid'

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <FileText className="h-8 w-8" />
            فاتورة #{invoice.invoiceNumber}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge className={statusConfig.color}>
              <StatusIcon className="ms-1 h-3 w-3" />
              {statusConfig.label}
            </Badge>
            {isOverdue && invoice.status !== 'paid' && <Badge variant="destructive">متأخرة</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/invoices">
              <ArrowRight className="ms-2 h-4 w-4" />
              العودة
            </Link>
          </Button>
          <Button variant="outline">
            <Printer className="ms-2 h-4 w-4" />
            طباعة
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const url = `/api/invoices/${invoice.id}/pdf?locale=ar`
              window.open(url, '_blank', 'noopener,noreferrer')
            }}
          >
            <Download className="ms-2 h-4 w-4" />
            تحميل PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المبلغ الإجمالي</p>
                <p className="text-2xl font-bold">{formatCurrency(invoice.totalAmount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المدفوع</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(invoice.paidAmount)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المتبقي</p>
                <p
                  className={`text-2xl font-bold ${remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}
                >
                  {formatCurrency(remainingAmount)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الاستحقاق</p>
                <p className={`text-lg font-bold ${isOverdue ? 'text-red-600' : ''}`}>
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                معلومات العميل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">الاسم</p>
                  <p className="font-medium">{invoice.customer.name || invoice.customer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                  <p className="font-medium">{invoice.customer.email}</p>
                </div>
                {invoice.customer.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">الهاتف</p>
                    <p className="font-medium" dir="ltr">
                      {invoice.customer.phone}
                    </p>
                  </div>
                )}
                {invoice.customer.companyName && (
                  <div>
                    <p className="text-sm text-muted-foreground">الشركة</p>
                    <p className="font-medium">{invoice.customer.companyName}</p>
                  </div>
                )}
                {invoice.customer.taxNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">الرقم الضريبي</p>
                    <p className="font-medium">{invoice.customer.taxNumber}</p>
                  </div>
                )}
                {(invoice.customer as { billingAddress?: string | null }).billingAddress && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">عنوان الفوترة</p>
                    <p className="font-medium">{(invoice.customer as { billingAddress?: string | null }).billingAddress}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle>بنود الفاتورة</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الوصف</TableHead>
                    <TableHead className="text-center">الكمية</TableHead>
                    <TableHead className="text-center">الأيام</TableHead>
                    <TableHead className="text-start">سعر الوحدة / يوم</TableHead>
                    <TableHead className="text-start">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow key={item.id ?? `row-${index}`}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center">
                        {item.days != null ? item.days : '—'}
                      </TableCell>
                      <TableCell className="text-start">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-start font-medium">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="my-4 border-t" />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>الخصم</span>
                    <span>-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ضريبة القيمة المضافة (15%)</span>
                  <span>{formatCurrency(invoice.vatAmount)}</span>
                </div>
                <div className="my-2 border-t" />
                <div className="flex justify-between text-lg font-bold">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  سجل المدفوعات
                </CardTitle>
                {remainingAmount > 0 && (
                  <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                    تسجيل دفعة
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CreditCard className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>لا توجد مدفوعات مسجلة</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الطريقة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>{payment.method}</TableCell>
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>الإجراءات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoice.status === 'draft' && (
                <Button className="w-full" onClick={handleSendInvoice}>
                  <Send className="ms-2 h-4 w-4" />
                  إرسال للعميل
                </Button>
              )}
              {remainingAmount > 0 && invoice.status !== 'cancelled' && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(true)}
                >
                  <CreditCard className="ms-2 h-4 w-4" />
                  تسجيل دفعة
                </Button>
              )}
              {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleStatusChange('paid')}
                >
                  <CheckCircle className="ms-2 h-4 w-4" />
                  تحديد كمدفوعة
                </Button>
              )}
              {invoice.status !== 'cancelled' && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleStatusChange('cancelled')}
                >
                  <AlertCircle className="ms-2 h-4 w-4" />
                  إلغاء الفاتورة
                </Button>
              )}
              <Button className="w-full" variant="outline" onClick={loadInvoice}>
                <RefreshCw className="ms-2 h-4 w-4" />
                تحديث
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
                <p className="text-sm text-muted-foreground">تاريخ الإصدار</p>
                <p className="font-medium">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الاستحقاق</p>
                <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
              {invoice.booking && (
                <div>
                  <p className="text-sm text-muted-foreground">الحجز المرتبط</p>
                  <Link
                    href={`/admin/bookings/${invoice.booking.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {invoice.booking.bookingNumber}
                  </Link>
                </div>
              )}
              {invoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">ملاحظات</p>
                  <p className="mt-1 rounded bg-muted p-2 text-sm">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة</DialogTitle>
            <DialogDescription>المتبقي: {formatCurrency(remainingAmount)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>المبلغ *</Label>
              <Input
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                placeholder="0.00"
                max={remainingAmount}
              />
            </div>
            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <Select
                value={paymentData.method}
                onValueChange={(value) => setPaymentData({ ...paymentData, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="card">بطاقة ائتمان</SelectItem>
                  <SelectItem value="tap">Tap Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>رقم المرجع (اختياري)</Label>
              <Input
                value={paymentData.reference}
                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                placeholder="رقم الحوالة أو المعاملة"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleRecordPayment} disabled={recordingPayment}>
              {recordingPayment ? 'جاري التسجيل...' : 'تسجيل الدفعة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
