/**
 * @file page.tsx
 * @description Finance page (Invoices/Payments/Deposits/Refunds) with real data
 * @module app/admin/(routes)/finance
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DollarSign, TrendingUp, TrendingDown, Clock, Eye, Plus, RefreshCw } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import { useToast } from '@/hooks/use-toast'

interface Invoice {
  id: string
  invoiceNumber: string
  customerId: string
  bookingId?: string | null
  totalAmount: number
  paidAmount: number
  status: string
  dueDate: string
  createdAt: string
  customer?: { name: string | null; email: string }
  booking?: { bookingNumber: string }
}

interface Payment {
  id: string
  bookingId: string
  amount: number
  status: string
  tapTransactionId?: string | null
  createdAt: string
  booking?: { bookingNumber: string; customer?: { name: string | null; email: string } }
}

interface DepositItem {
  id: string
  bookingNumber: string
  status: string
  depositAmount: number
  totalAmount: number
  startDate: string
  endDate: string
  createdAt: string
  paidDate: string | null
  depositStatus: 'paid' | 'pending' | 'refunded'
  customer: { id: string; name: string | null; email: string }
}

interface RefundItem {
  id: string
  bookingId: string
  bookingNumber: string | null
  customer: { id: string; name: string | null; email: string } | null
  amount: number
  status: string
  refundAmount: number | null
  refundReason: string | null
  createdAt: string
  updatedAt: string
}

interface FinanceStats {
  totalRevenue: number
  pendingPayments: number
  overdueInvoices: number
  thisMonthRevenue: number
}

const DEPOSIT_STATUS_LABELS: Record<string, { ar: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  paid: { ar: 'مدفوع', variant: 'default' },
  pending: { ar: 'قيد الانتظار', variant: 'secondary' },
  refunded: { ar: 'مسترد', variant: 'destructive' },
}

const INVOICE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-800' },
  sent: { label: 'مُرسلة', color: 'bg-blue-100 text-blue-800' },
  paid: { label: 'مدفوعة', color: 'bg-green-100 text-green-800' },
  partial: { label: 'جزئية', color: 'bg-yellow-100 text-yellow-800' },
  overdue: { label: 'متأخرة', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'ملغاة', color: 'bg-gray-100 text-gray-800' },
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-800' },
  PROCESSING: { label: 'قيد المعالجة', color: 'bg-blue-100 text-blue-800' },
  SUCCESS: { label: 'ناجح', color: 'bg-green-100 text-green-800' },
  FAILED: { label: 'فشل', color: 'bg-red-100 text-red-800' },
  REFUNDED: { label: 'مسترد', color: 'bg-purple-100 text-purple-800' },
}

export default function FinancePage() {
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [deposits, setDeposits] = useState<DepositItem[]>([])
  const [refunds, setRefunds] = useState<RefundItem[]>([])
  const [stats, setStats] = useState<FinanceStats | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [invoicesRes, paymentsRes, depositsRes, refundsRes] = await Promise.all([
        fetch('/api/invoices?pageSize=20'),
        fetch('/api/payments?pageSize=20'),
        fetch('/api/finance/deposits'),
        fetch('/api/finance/refunds'),
      ])

      let invoicesData: Invoice[] = []
      let paymentsData: Payment[] = []

      if (invoicesRes.ok) {
        const data = await invoicesRes.json()
        invoicesData = data.data || []
        setInvoices(invoicesData)
      }

      if (paymentsRes.ok) {
        const data = await paymentsRes.json()
        paymentsData = data.data || []
        setPayments(paymentsData)
      }

      if (depositsRes.ok) {
        const json = await depositsRes.json()
        setDeposits(json.data ?? [])
      }

      if (refundsRes.ok) {
        const json = await refundsRes.json()
        setRefunds(json.data ?? [])
      }

      // Calculate stats from fetched data
      const successPayments = paymentsData.filter((p) => p.status === 'SUCCESS')
      const totalRevenue = successPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const pendingPayments = paymentsData
        .filter((p) => p.status === 'PENDING')
        .reduce((sum, p) => sum + Number(p.amount), 0)
      const overdueInvoices = invoicesData.filter(
        (i) => i.status === 'overdue' || (new Date(i.dueDate) < new Date() && i.status !== 'paid')
      ).length

      setStats({
        totalRevenue,
        pendingPayments,
        overdueInvoices,
        thisMonthRevenue: totalRevenue, // Simplified
      })
    } catch {
      toast({
        title: 'خطأ',
        description: 'فشل تحميل البيانات المالية',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">المالية</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="ml-2 h-4 w-4" />
            تحديث
          </Button>
          <Button asChild>
            <Link href="/admin/invoices/new">
              <Plus className="ml-2 h-4 w-4" />
              فاتورة جديدة
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مدفوعات معلقة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(stats?.pendingPayments || 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">فواتير متأخرة</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{stats?.overdueInvoices || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إيرادات الشهر</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats?.thisMonthRevenue || 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">الفواتير</TabsTrigger>
          <TabsTrigger value="payments">المدفوعات</TabsTrigger>
          <TabsTrigger value="deposits">العربون</TabsTrigger>
          <TabsTrigger value="refunds">الاستردادات</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">آخر الفواتير</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/invoices">عرض الكل</Link>
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="space-y-2 py-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      لا توجد فواتير
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.slice(0, 10).map((invoice) => {
                    const statusConf = INVOICE_STATUS_CONFIG[invoice.status] || {
                      label: invoice.status,
                      color: 'bg-gray-100',
                    }
                    const isOverdue =
                      new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid'
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          {invoice.customer?.name || invoice.customer?.email || '-'}
                        </TableCell>
                        <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge
                            className={isOverdue ? 'bg-red-100 text-red-800' : statusConf.color}
                          >
                            {isOverdue ? 'متأخرة' : statusConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell className={isOverdue ? 'text-red-600' : ''}>
                          {formatDate(invoice.dueDate)}
                        </TableCell>
                        <TableCell>
                          <Link href={`/admin/invoices/${invoice.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="ml-1 h-4 w-4" />
                              عرض
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">آخر المدفوعات</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/payments">عرض الكل</Link>
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>معرف المعاملة</TableHead>
                  <TableHead>رقم الحجز</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="space-y-2 py-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      لا توجد مدفوعات
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.slice(0, 10).map((payment) => {
                    const statusConf = PAYMENT_STATUS_CONFIG[payment.status] || {
                      label: payment.status,
                      color: 'bg-gray-100',
                    }
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">
                          {payment.tapTransactionId
                            ? payment.tapTransactionId.substring(0, 15) + '...'
                            : '-'}
                        </TableCell>
                        <TableCell>{payment.booking?.bookingNumber || '-'}</TableCell>
                        <TableCell>
                          {payment.booking?.customer?.name ||
                            payment.booking?.customer?.email ||
                            '-'}
                        </TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>
                          <Badge className={statusConf.color}>{statusConf.label}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(payment.createdAt)}</TableCell>
                        <TableCell>
                          <Link href={`/admin/payments/${payment.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="ml-1 h-4 w-4" />
                              عرض
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="deposits" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">العربون</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/finance/deposits">عرض الكل</Link>
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الحجز</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>مبلغ العربون</TableHead>
                  <TableHead>حالة العربون</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="space-y-2 py-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : deposits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      لا توجد عربون
                    </TableCell>
                  </TableRow>
                ) : (
                  deposits.slice(0, 10).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        <Link href={`/admin/bookings/${row.id}`} className="text-primary hover:underline">
                          #{row.bookingNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{row.customer.name || row.customer.email}</TableCell>
                      <TableCell>{formatCurrency(row.depositAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={DEPOSIT_STATUS_LABELS[row.depositStatus]?.variant ?? 'secondary'}>
                          {DEPOSIT_STATUS_LABELS[row.depositStatus]?.ar ?? row.depositStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.paidDate ? formatDate(row.paidDate) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/bookings/${row.id}`}>
                            <Eye className="ml-1 h-4 w-4" />
                            عرض
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="refunds" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">الاستردادات</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/finance/refunds">عرض الكل</Link>
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الحجز</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>مبلغ الاسترداد</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="space-y-2 py-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : refunds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      لا توجد استردادات
                    </TableCell>
                  </TableRow>
                ) : (
                  refunds.slice(0, 10).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link href={`/admin/bookings/${row.bookingId}`} className="text-primary hover:underline">
                          #{row.bookingNumber ?? row.bookingId.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>{row.customer?.name || row.customer?.email || '—'}</TableCell>
                      <TableCell>{formatCurrency(row.amount)}</TableCell>
                      <TableCell className="font-medium text-destructive">
                        {row.refundAmount != null ? formatCurrency(row.refundAmount) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'REFUNDED' ? 'destructive' : 'secondary'}>
                          {row.status === 'REFUNDED' ? 'مسترد' : row.status === 'PARTIALLY_REFUNDED' ? 'مسترد جزئياً' : row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(row.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/payments/${row.id}`}>
                            <Eye className="ml-1 h-4 w-4" />
                            عرض
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
