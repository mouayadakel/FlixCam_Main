/**
 * @file invoices/[id]/page.tsx
 * @description Premium ZATCA-compliant Invoice detail page with Live Template Customizer & Daftra ERP integration widget.
 * Supports bilingual Arabic/English layouts and high-fidelity browser A4 printing.
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
  Sparkles,
  Eye,
  Sliders,
  Settings,
  ShieldCheck,
  Check,
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useVatRate } from '@/hooks/use-vat-rate'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { EMBED_LTR } from '@/lib/i18n/bidi'

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
  zatcaQR?: string | null
  zatcaHash?: string | null
  zatcaStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SUBMITTED' | 'CLEARED' | null
  customer: {
    id: string
    name: string | null
    email: string
    phone?: string | null
    companyName?: string | null
    taxNumber?: string | null
    billingAddress?: string | null
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
  draft: { label: 'مسودة', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: FileText },
  sent: { label: 'مُرسلة', color: 'bg-sky-100 text-sky-800 border-sky-200', icon: Send },
  paid: { label: 'مدفوعة', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
  partial: { label: 'مدفوعة جزئياً', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  overdue: { label: 'متأخرة', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: AlertCircle },
  cancelled: { label: 'ملغاة', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: AlertCircle },
}

const ACCENT_COLORS = [
  { name: 'FlixCam Green', value: '#00c853', class: 'bg-emerald-500 border-emerald-600' },
  { name: 'Sleek Slate', value: '#334155', class: 'bg-slate-700 border-slate-800' },
  { name: 'Ocean Blue', value: '#0284c7', class: 'bg-sky-600 border-sky-700' },
  { name: 'Bronze Amber', value: '#d97706', class: 'bg-amber-600 border-amber-700' },
]

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { percentLabel } = useVatRate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [syncingDaftra, setSyncingDaftra] = useState(false)
  const [syncingZatca, setSyncingZatca] = useState(false)
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'cash',
    reference: '',
  })

  // Style Customizer States
  const [customizer, setCustomizer] = useState({
    primaryColor: '#00c853',
    showLogo: true,
    showTagline: true,
    showAddress: true,
    showVatBreakdown: true,
    customNotes: '',
    customTerms: 'خاضعة لقوانين وأنظمة الفوترة الضريبية في المملكة العربية السعودية | Subject to Saudi Arabia tax invoicing regulations',
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
      const fetchedInvoice = data.data || data
      setInvoice(fetchedInvoice)
      
      // Seed customizer notes from invoice details if present
      if (fetchedInvoice.notes) {
        setCustomizer((prev) => ({ ...prev, customNotes: fetchedInvoice.notes || '' }))
      }
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

  const handleZatcaClearance = async () => {
    setSyncingZatca(true)
    try {
      const response = await fetch(`/api/admin/invoices/${params?.id}/zatca-clearance`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'فشل تخليص ZATCA')
      }
      toast({
        title: 'ZATCA',
        description: data.submitted
          ? 'تم إرسال الفاتورة إلى ZATCA بنجاح'
          : 'تم تجهيز الفاتورة وQR الضريبي',
      })
      loadInvoice()
    } catch (error: unknown) {
      toast({
        title: 'ZATCA',
        description: error instanceof Error ? error.message : 'فشل تخليص ZATCA',
        variant: 'destructive',
      })
    } finally {
      setSyncingZatca(false)
    }
  }

  const handleDaftraSync = async () => {
    setSyncingDaftra(true)
    try {
      const response = await fetch(`/api/invoices/${params?.id}/sync`, {
        method: 'POST',
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'فشل المزامنة مع دفترة')
      }

      toast({
        title: 'تمت المزامنة بنجاح',
        description: 'تم إرسال الفاتورة والعميل إلى نظام دفترة ERP وتحديث حالة ZATCA',
      })

      loadInvoice()
    } catch (error: any) {
      toast({
        title: 'فشل المزامنة',
        description: error.message || 'فشل إرسال البيانات لنظام دفترة',
        variant: 'destructive',
      })
    } finally {
      setSyncingDaftra(false)
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
  const remainingAmount = Math.max(0, invoice.totalAmount - invoice.paidAmount)
  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid'

  // Daftra variables
  const isSynced = invoice.zatcaHash?.startsWith('daftra_')
  const daftraId = isSynced ? invoice.zatcaHash?.replace('daftra_', '') : null
  const daftraDomain = invoice.notes?.match(/\[Daftra Synced: https:\/\/(.*?)\.daftra\.com/)?.[1] || 'subdomain'
  const daftraUrl = isSynced ? `https://${daftraDomain}.daftra.com/v2/invoices/${daftraId}` : null

  return (
    <div className="space-y-6 print:m-0 print:p-0 print:bg-white" dir="rtl">
      {/* Print Specific CSS Overrides */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: #1e293b !important;
          }
          nav, header, footer, sidebar, .no-print, button, .badge, .toast, .dialog, .breadcrumb {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-paper-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: #1e293b !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between no-print">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <FileText className="h-8 w-8 text-slate-700" />
            فاتورة #{invoice.invoiceNumber}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className={`${statusConfig.color} border font-medium px-2.5 py-0.5`}>
              <StatusIcon className="me-1 h-3.5 w-3.5" />
              {statusConfig.label}
            </Badge>
            {isOverdue && invoice.status !== 'paid' && (
              <Badge variant="destructive" className="font-medium">متأخرة السداد</Badge>
            )}
            {isSynced ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                <ShieldCheck className="me-1 h-3.5 w-3.5" />
                مزامنة دفترة + ZATCA
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                غير متزامنة مع ERP
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/invoices">
              <ArrowRight className="me-2 h-4 w-4" />
              العودة
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="me-2 h-4 w-4" />
            طباعة الفاتورة
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const url = `/api/invoices/${invoice.id}/pdf?locale=ar`
              window.open(url, '_blank', 'noopener,noreferrer')
            }}
          >
            <Download className="me-2 h-4 w-4" />
            تحميل PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleZatcaClearance}
            disabled={syncingZatca || invoice.zatcaStatus === 'CLEARED'}
          >
            {syncingZatca ? (
              <RefreshCw className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="me-2 h-4 w-4" />
            )}
            تخليص ZATCA
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 no-print">
        <Card className="border-slate-100 bg-white/60 backdrop-blur-md">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">الإجمالي المستحق</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{formatCurrency(invoice.totalAmount)}</p>
              </div>
              <div className="rounded-full bg-slate-100 p-3 text-slate-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-white/60 backdrop-blur-md">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">المبلغ المدفوع</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{formatCurrency(invoice.paidAmount)}</p>
              </div>
              <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-white/60 backdrop-blur-md">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">المبلغ المتبقي</p>
                <p className={`text-2xl font-extrabold mt-1 ${remainingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatCurrency(remainingAmount)}
                </p>
              </div>
              <div className={`rounded-full p-3 ${remainingAmount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-white/60 backdrop-blur-md">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">تاريخ الاستحقاق</p>
                <p className={`text-lg font-bold mt-2 ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
              <div className="rounded-full bg-slate-100 p-3 text-slate-600">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 print-full-width">
        {/* Main A4 Mockup Sheet Container */}
        <div className="lg:col-span-3 space-y-6 print-full-width">
          {/* Real-time Interactive A4 Paper Sheet Preview */}
          <div 
            className="print-paper-sheet bg-white border border-slate-200 shadow-xl rounded-xl p-8 max-w-4xl mx-auto text-slate-800 relative transition-all duration-300 overflow-hidden"
            style={{ borderTop: `6px solid ${customizer.primaryColor}` }}
          >
            {/* Watermark/Status Indicator */}
            {invoice.status === 'paid' && (
              <div className="absolute top-12 left-12 border-4 border-emerald-500/20 text-emerald-500/20 font-black rounded-xl text-3xl uppercase px-4 py-2 rotate-[-20deg] select-none pointer-events-none no-print">
                مدفوعة | Paid
              </div>
            )}

            {/* Bilingual Header */}
            <div className="flex flex-col justify-between border-b pb-6 sm:flex-row gap-6">
              <div className="space-y-2">
                {customizer.showLogo && (
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-white shadow-md"
                      style={{ backgroundColor: customizer.primaryColor }}
                    >
                      FC
                    </div>
                    <span className="text-2xl font-black tracking-tight" style={{ color: customizer.primaryColor }}>
                      FLIXCAM
                    </span>
                  </div>
                )}
                {customizer.showTagline && (
                  <p className="text-xs text-slate-500 font-medium">
                    تأجير كاميرات ومعدات سينمائية | Camera & Cinema Equipment Rentals
                  </p>
                )}
                {customizer.showAddress && (
                  <div className="text-xs text-slate-600 leading-relaxed pt-1">
                    <p>المملكة العربية السعودية، الرياض | Riyadh, Saudi Arabia</p>
                    <p>الرقم الضريبي: 310459821300003 | VAT ID: 310459821300003</p>
                  </div>
                )}
              </div>
              <div className="text-right sm:text-left space-y-1">
                <h2 className="text-3xl font-black tracking-wide" style={{ color: customizer.primaryColor }}>
                  فاتورة ضريبية <span className="text-lg font-normal text-slate-500">/ TAX INVOICE</span>
                </h2>
                <p className="text-sm font-semibold">
                  رقم الفاتورة <span className="text-slate-500">/ Invoice No:</span> #{invoice.invoiceNumber}
                </p>
                <p className="text-xs">
                  تاريخ الإصدار <span className="text-slate-500">/ Issue Date:</span> {formatDate(invoice.issueDate)}
                </p>
                <p className="text-xs">
                  تاريخ الاستحقاق <span className="text-slate-500">/ Due Date:</span> {formatDate(invoice.dueDate)}
                </p>
              </div>
            </div>

            {/* Billing Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b text-sm">
              <div>
                <h3 className="font-bold border-b pb-2 mb-3" style={{ color: customizer.primaryColor }}>
                  العميل <span className="font-normal text-slate-500">/ Bill To</span>
                </h3>
                <div className="space-y-1 text-slate-700">
                  <p className="font-semibold text-slate-900">{invoice.customer.name || invoice.customer.email}</p>
                  {invoice.customer.companyName && (
                    <p>{invoice.customer.companyName}</p>
                  )}
                  <p>{invoice.customer.email}</p>
                  {invoice.customer.phone && (
                    <p dir="ltr" className="text-right">{invoice.customer.phone}</p>
                  )}
                  {invoice.customer.taxNumber && (
                    <p className="text-xs font-semibold bg-slate-50 border inline-block px-1.5 py-0.5 rounded mt-1">
                      الرقم الضريبي للعميل: {invoice.customer.taxNumber}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-bold border-b pb-2 mb-3" style={{ color: customizer.primaryColor }}>
                  معلومات الحجز <span className="font-normal text-slate-500">/ Order Info</span>
                </h3>
                <div className="space-y-1 text-slate-700">
                  {invoice.booking ? (
                    <p>الحجز رقم: <span className="font-mono font-semibold">{invoice.booking.bookingNumber}</span></p>
                  ) : (
                    <p>نوع الفاتورة: حجز مباشر</p>
                  )}
                  <p>العملة: ريال سعودي (SAR)</p>
                  <p>الحالة: <span className="font-semibold">{statusConfig.label}</span></p>
                </div>
              </div>
            </div>

            {/* Invoice Line Items Table */}
            <div className="py-6 overflow-x-auto">
              <Table className="border rounded-lg overflow-hidden">
                <TableHeader className="bg-slate-50" style={{ borderBottom: `2px solid ${customizer.primaryColor}` }}>
                  <TableRow>
                    <TableHead className="text-right text-slate-700 font-bold">الوصف / Description</TableHead>
                    <TableHead className="text-center text-slate-700 font-bold">الكمية / Qty</TableHead>
                    <TableHead className="text-center text-slate-700 font-bold">الأيام / Days</TableHead>
                    <TableHead className="text-left text-slate-700 font-bold">السعر / Unit Price</TableHead>
                    <TableHead className="text-left text-slate-700 font-bold">الإجمالي / Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow key={item.id ?? `row-${index}`} className="border-b">
                      <TableCell className="font-medium text-slate-900">{item.description}</TableCell>
                      <TableCell className="text-center font-semibold">{item.quantity}</TableCell>
                      <TableCell className="text-center text-slate-600">{item.days ?? '—'}</TableCell>
                      <TableCell className="text-left text-slate-600">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-left font-semibold text-slate-900">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t">
              {/* ZATCA QR Code Display */}
              <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-slate-50/50">
                <p className="text-xs font-bold text-slate-500 mb-2">
                  الرمز الضريبي الذكي ZATCA QR Code
                </p>
                {invoice.zatcaQR ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(invoice.zatcaQR)}&size=130x130&margin=1`}
                    alt="ZATCA Compliance QR Code"
                    className="h-32 w-32 shadow-sm rounded border bg-white"
                  />
                ) : (
                  <div className="h-32 w-32 border-2 border-dashed border-slate-200 rounded flex flex-col items-center justify-center text-slate-400 text-center p-2 bg-white">
                    <Sparkles className="h-6 w-6 mb-1 text-slate-300 animate-pulse" />
                    <span className="text-[10px]">بانتظار المزامنة لتوليد الرمز</span>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed">
                  متوافق مع معايير هيئة الزكاة والضريبة والجمارك الكترونياً
                </p>
              </div>

              {/* Summary Calculations */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>المجموع الفرعي <span className="text-xs text-slate-400">/ Subtotal:</span></span>
                  <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>الخصم <span className="text-xs text-emerald-500">/ Discount:</span></span>
                    <span>-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                {customizer.showVatBreakdown && (
                  <div className="flex justify-between text-slate-600">
                    <span>ضريبة القيمة المضافة ({percentLabel}) <span className="text-xs text-slate-400">/ VAT:</span></span>
                    <span className="font-semibold">{formatCurrency(invoice.vatAmount)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between text-lg font-black" style={{ color: customizer.primaryColor }}>
                  <span>الإجمالي النهائي <span className="text-xs font-normal text-slate-500">/ Total:</span></span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
                </div>

                {invoice.paidAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 text-xs font-bold pt-1">
                    <span>المبلغ المدفوع <span className="text-[10px] font-normal text-slate-500">/ Paid:</span></span>
                    <span>{formatCurrency(invoice.paidAmount)}</span>
                  </div>
                )}
                {remainingAmount > 0 && (
                  <div className="flex justify-between text-rose-600 text-xs font-bold">
                    <span>المبلغ المتبقي <span className="text-[10px] font-normal text-slate-500">/ Balance Due:</span></span>
                    <span>{formatCurrency(remainingAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Notes & Payment Terms */}
            {(customizer.customNotes || customizer.customTerms) && (
              <div className="mt-8 border-t pt-6 text-[11px] leading-relaxed text-slate-500 space-y-4">
                {customizer.customNotes && (
                  <div>
                    <h4 className="font-bold text-slate-700 text-xs mb-1">ملاحظات الفاتورة / Notes:</h4>
                    <p className="bg-slate-50 p-2.5 rounded border border-slate-100">{customizer.customNotes}</p>
                  </div>
                )}
                {customizer.customTerms && (
                  <div className="text-center border-t border-dashed pt-4">
                    <p className="italic">{customizer.customTerms}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment History Card */}
          <Card className="border-slate-100 bg-white/60 backdrop-blur-md no-print">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-slate-600" />
                  سجل الدفع والتحصيلات
                </CardTitle>
                <CardDescription>جميع المعاملات المالية المسجلة على هذه الفاتورة</CardDescription>
              </div>
              {remainingAmount > 0 && invoice.status !== 'cancelled' && (
                <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                  تسجيل دفعة جديدة
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                  <CreditCard className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-sm">لا توجد دفعات مسجلة بعد</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>المبلغ / Amount</TableHead>
                        <TableHead>الوسيلة / Method</TableHead>
                        <TableHead>حالة العملية / Status</TableHead>
                        <TableHead>تاريخ التحصيل / Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-bold text-emerald-600">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">{payment.method}</TableCell>
                          <TableCell>
                            <Badge variant={payment.status === 'SUCCESS' ? 'default' : 'secondary'} className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              {payment.status === 'SUCCESS' ? 'ناجحة' : payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{formatDate(payment.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions & Customizer */}
        <div className="space-y-6 no-print">
          {/* Daftra Sync Center */}
          <Card className="border-slate-100 bg-white/60 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 h-1.5 w-full bg-slate-900" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-700" />
                Daftra ERP Integration
              </CardTitle>
              <CardDescription>إدارة المزامنة وهيئة الزكاة والضريبة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 border text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">حالة المزامنة:</span>
                  <span className={`font-bold ${isSynced ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isSynced ? 'متزامن' : 'بانتظار المزامنة'}
                  </span>
                </div>
                {isSynced && (
                  <div className="flex justify-between border-t pt-1.5">
                    <span className="text-slate-500">رقم الفاتورة بدفترة:</span>
                    <span className="font-mono font-bold text-slate-700">#{invoice.invoiceNumber}</span>
                  </div>
                )}
              </div>

              {!isSynced ? (
                <Button 
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white" 
                  onClick={handleDaftraSync}
                  disabled={syncingDaftra || invoice.status === 'cancelled'}
                >
                  {syncingDaftra ? (
                    <>
                      <RefreshCw className="me-2 h-4 w-4 animate-spin" />
                      جاري إرسال البيانات...
                    </>
                  ) : (
                    <>
                      <Sparkles className="me-2 h-4 w-4 text-yellow-400" />
                      مزامنة الفاتورة مع دفترة
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button className="w-full border-emerald-200 text-emerald-800 hover:bg-emerald-50" variant="outline" asChild>
                    <a href={daftraUrl || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                      <Eye className="me-2 h-4 w-4" />
                      عرض في لوحة دفترة
                    </a>
                  </Button>
                  <Button className="w-full" variant="outline" onClick={handleDaftraSync} disabled={syncingDaftra}>
                    <RefreshCw className="me-2 h-4 w-4" />
                    إعادة المزامنة والتحقق
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Style Customizer Control Center */}
          <Card className="border-slate-100 bg-white/60 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="h-5 w-5 text-slate-700" />
                مخصِّص القوالب والطباعة
              </CardTitle>
              <CardDescription>قم بتخصيص مظهر الفاتورة فورياً</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Accent Color Chooser */}
              <div className="space-y-2">
                <Label className="text-xs">اللون المميز للقالب / Accent Color</Label>
                <div className="flex gap-2.5 pt-1">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={`h-7 w-7 rounded-full transition-transform cursor-pointer border-2 ${color.class} ${
                        customizer.primaryColor === color.value ? 'scale-125 border-slate-900 shadow-md ring-2 ring-slate-400/20' : 'opacity-70 hover:opacity-100'
                      }`}
                      onClick={() => setCustomizer({ ...customizer, primaryColor: color.value })}
                      title={color.name}
                    >
                      {customizer.primaryColor === color.value && (
                        <Check className="h-3 w-3 text-white mx-auto font-black" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3.5 border-t pt-4">
                <Label className="text-xs text-slate-500 uppercase tracking-wider block mb-1">عرض محتويات الهيدر</Label>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">شعار المنصة</span>
                  <Switch
                    checked={customizer.showLogo}
                    onCheckedChange={(checked) => setCustomizer({ ...customizer, showLogo: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">شعار التاجلاين</span>
                  <Switch
                    checked={customizer.showTagline}
                    onCheckedChange={(checked) => setCustomizer({ ...customizer, showTagline: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">عنوان المقر والضرائب</span>
                  <Switch
                    checked={customizer.showAddress}
                    onCheckedChange={(checked) => setCustomizer({ ...customizer, showAddress: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">تفصيل الضريبة المفردة</span>
                  <Switch
                    checked={customizer.showVatBreakdown}
                    onCheckedChange={(checked) => setCustomizer({ ...customizer, showVatBreakdown: checked })}
                  />
                </div>
              </div>

              {/* Form entries */}
              <div className="space-y-3.5 border-t pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">ملاحظات إضافية للفاتورة</Label>
                  <Textarea
                    placeholder="ملاحظات على شروط الدفع، الأقساط..."
                    className="text-xs min-h-[60px]"
                    value={customizer.customNotes}
                    onChange={(e) => setCustomizer({ ...customizer, customNotes: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">تذييل شروط السداد</Label>
                  <Textarea
                    placeholder="شروط السداد الضريبي..."
                    className="text-xs min-h-[60px]"
                    value={customizer.customTerms}
                    onChange={(e) => setCustomizer({ ...customizer, customTerms: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="border-slate-100 bg-white/60 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">إجراءات إدارية سريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.status === 'draft' && (
                <Button className="w-full" onClick={handleSendInvoice}>
                  <Send className="me-2 h-4 w-4" />
                  إرسال للعميل
                </Button>
              )}
              {remainingAmount > 0 && invoice.status !== 'cancelled' && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(true)}
                >
                  <CreditCard className="me-2 h-4 w-4" />
                  تسجيل دفعة سريعة
                </Button>
              )}
              {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                <Button
                  className="w-full border-slate-200 text-slate-800"
                  variant="outline"
                  onClick={() => handleStatusChange('paid')}
                >
                  <CheckCircle className="me-2 h-4 w-4" />
                  تحديد كمدفوعة بالكامل
                </Button>
              )}
              {invoice.status !== 'cancelled' && (
                <Button
                  className="w-full border-rose-100 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  variant="outline"
                  onClick={() => handleStatusChange('cancelled')}
                >
                  <AlertCircle className="me-2 h-4 w-4" />
                  إلغاء الفاتورة
                </Button>
              )}
              <Button className="w-full border-slate-200 text-slate-800" variant="outline" onClick={loadInvoice}>
                <RefreshCw className="me-2 h-4 w-4" />
                تحديث البيانات
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة مالية</DialogTitle>
            <DialogDescription>المتبقي غير المحصل: {formatCurrency(remainingAmount)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>المبلغ المالي المودع *</Label>
              <Input
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                placeholder="0.00"
                max={remainingAmount}
              />
            </div>
            <div className="space-y-2">
              <Label>طريقة / وسيلة الدفع</Label>
              <Select
                value={paymentData.method}
                onValueChange={(value) => setPaymentData({ ...paymentData, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي / Cash</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي / Bank Transfer</SelectItem>
                  <SelectItem value="card">بطاقة ائتمان / Credit Card</SelectItem>
                  <SelectItem value="tap">Tap Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>رقم المعاملة أو الإيصال (اختياري)</Label>
              <Input
                value={paymentData.reference}
                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                placeholder="رقم الحوالة أو المرجع"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleRecordPayment} disabled={recordingPayment} className="bg-slate-900 text-white">
              {recordingPayment ? 'جاري تسجيل الدفعة...' : 'إتمام وتسجيل'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
