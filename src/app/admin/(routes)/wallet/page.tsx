/**
 * @file page.tsx
 * @description Wallet/Credits page – wired to GET /api/wallet
 * @module app/admin/(routes)/wallet
 */

'use client'

import { useState, useEffect } from 'react'
import { TableFilters } from '@/components/tables/table-filters'
import { TablePagination } from '@/components/tables/table-pagination'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatCurrency, formatDate } from '@/lib/utils/format.utils'
import {
  Eye,
  Loader2,
  RefreshCw,
  AlertCircle,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface WalletTx {
  id: string
  user: string
  type: string
  amount: number
  balance: number
  note?: string
  createdAt: string
}

interface WalletSummary {
  totalBalance: number
  totalCredits: number
  totalDebits: number
}

export default function WalletPage() {
  const { toast } = useToast()
  const [data, setData] = useState<WalletTx[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<WalletSummary | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addType, setAddType] = useState<'credit' | 'debit'>('credit')
  const [addUser, setAddUser] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [addNote, setAddNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchWallet = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      if (typeFilter && typeFilter !== 'All') params.set('type', typeFilter)
      if (search) params.set('search', search)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/wallet?${params}`)
      if (!res.ok) throw new Error('Failed to load wallet')
      const json = await res.json()
      setData(Array.isArray(json.data) ? json.data : [])
      setTotal(typeof json.total === 'number' ? json.total : 0)
      if (json.summary) setSummary(json.summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تحميل المعاملات')
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWallet()
  }, [page, pageSize, typeFilter, dateFrom, dateTo])

  const handleOpenAdd = (type: 'credit' | 'debit') => {
    setAddType(type)
    setAddUser('')
    setAddAmount('')
    setAddNote('')
    setAddDialogOpen(true)
  }

  const handleSubmitAdd = async () => {
    const amount = parseFloat(addAmount)
    if (!addUser.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'خطأ', description: 'أدخل المستخدم ومبلغاً صحيحاً', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: addUser.trim(),
          type: addType,
          amount,
          note: addNote.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'فشل الإضافة')
      }
      setAddDialogOpen(false)
      await fetchWallet()
      toast({ title: 'تم', description: addType === 'credit' ? 'تمت إضافة رصيد' : 'تم خصم المبلغ' })
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const types = ['All', 'credit', 'debit']

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">المحفظة</h1>
          <p className="mt-1 text-muted-foreground">معاملات الرصيد والائتمان</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" onClick={() => handleOpenAdd('credit')} disabled={loading}>
            <ArrowDownCircle className="ms-2 h-4 w-4" />
            إضافة رصيد
          </Button>
          <Button variant="outline" onClick={() => handleOpenAdd('debit')} disabled={loading}>
            <ArrowUpCircle className="ms-2 h-4 w-4" />
            خصم
          </Button>
          <Button variant="outline" onClick={fetchWallet} disabled={loading}>
            <RefreshCw className={`ms-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الرصيد</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{formatCurrency(summary.totalBalance)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الإيداعات</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalCredits)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المسحوبات</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalDebits)}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <TableFilters
          searchPlaceholder="البحث في المعاملات..."
          statusOptions={types}
          onSearchChange={setSearch}
          onStatusChange={setTypeFilter}
        />
        <div className="flex items-center gap-2">
          <Label className="shrink-0 text-sm text-muted-foreground">من تاريخ</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
          <Label className="shrink-0 text-sm text-muted-foreground">إلى تاريخ</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-red-800">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchWallet}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المستخدم</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>الرصيد بعد</TableHead>
              <TableHead>مرجع</TableHead>
              <TableHead>ملاحظة</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead className="text-end">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">جاري التحميل...</p>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  لا توجد معاملات
                </TableCell>
              </TableRow>
            ) : (
              data.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">{tx.user}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        tx.type === 'credit'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {tx.type === 'credit' ? 'إيداع' : 'سحب'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(tx.amount)}</TableCell>
                  <TableCell>{formatCurrency(tx.balance)}</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell>{tx.note ?? '—'}</TableCell>
                  <TableCell>{formatDate(tx.createdAt)}</TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/wallet/${tx.id}`}>
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

      {total > 0 && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          itemLabel="معاملة"
          dir="rtl"
        />
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{addType === 'credit' ? 'إضافة رصيد' : 'خصم'}</DialogTitle>
            <DialogDescription>
              {addType === 'credit' ? 'إضافة مبلغ إلى المحفظة' : 'خصم مبلغ من المحفظة'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-user">المستخدم</Label>
              <Input
                id="add-user"
                value={addUser}
                onChange={(e) => setAddUser(e.target.value)}
                placeholder="معرّف أو اسم المستخدم"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-amount">المبلغ</Label>
              <Input
                id="add-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-note">ملاحظة (اختياري)</Label>
              <Input
                id="add-note"
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                placeholder="سبب الإيداع أو الخصم"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={submitting}>
              إلغاء
            </Button>
            <Button onClick={handleSubmitAdd} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {addType === 'credit' ? 'إضافة رصيد' : 'خصم'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
