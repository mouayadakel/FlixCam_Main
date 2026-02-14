'use client'

import { useState, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'معلق',
  PROCESSING: 'قيد المعالجة',
  PAID: 'مدفوع',
  FAILED: 'فشل',
}

interface Payout {
  id: string
  grossAmount: number
  commissionAmount: number
  netAmount: number
  status: string
  paidAt: string | null
  bankRef: string | null
  createdAt: string
  vendor: { id: string; companyName: string }
}

export default function VendorPayoutsPage() {
  const { toast } = useToast()
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [bankRef, setBankRef] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadPayouts()
  }, [])

  const loadPayouts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/vendors/payouts')
      if (!res.ok) throw new Error('Failed to load payouts')
      const data = await res.json()
      setPayouts(data.items || [])
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل تحميل المدفوعات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const openMarkPaid = (p: Payout) => {
    setSelectedPayout(p)
    setBankRef('')
    setMarkPaidOpen(true)
  }

  const handleMarkPaid = async () => {
    if (!selectedPayout) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/vendors/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId: selectedPayout.id, bankRef }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'تم تسجيل الدفع' })
      setMarkPaidOpen(false)
      setSelectedPayout(null)
      loadPayouts()
    } catch {
      toast({ title: 'خطأ', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">مدفوعات الموردين</h1>

      <Card>
        <CardHeader>
          <CardTitle>قائمة المدفوعات</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>العمولة</TableHead>
                  <TableHead>الصافي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.createdAt)}</TableCell>
                    <TableCell>{p.vendor.companyName}</TableCell>
                    <TableCell>{formatCurrency(Number(p.grossAmount))}</TableCell>
                    <TableCell>{formatCurrency(Number(p.commissionAmount))}</TableCell>
                    <TableCell>{formatCurrency(Number(p.netAmount))}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === 'PAID'
                            ? 'default'
                            : p.status === 'FAILED'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {STATUS_LABELS[p.status] || p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.status === 'PENDING' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMarkPaid(p)}
                        >
                          تسجيل الدفع
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loading && payouts.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">لا توجد مدفوعات</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل الدفع</DialogTitle>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-4">
              <p className="text-sm">
                المورد: {selectedPayout.vendor.companyName}
                <br />
                المبلغ: {formatCurrency(Number(selectedPayout.netAmount))}
              </p>
              <div>
                <Label>مرجع البنك (اختياري)</Label>
                <Input
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  placeholder="رقم التحويل أو المرجع"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleMarkPaid} disabled={submitting}>
                  تأكيد الدفع
                </Button>
                <Button variant="outline" onClick={() => setMarkPaidOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
