/**
 * Admin Promissory Notes list page
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Eye, Download, Search, Plus } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
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
import { TablePagination } from '@/components/tables/table-pagination'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface PromissoryNoteRow {
  id: string
  noteNumber: string
  debtorName: string
  amountSar: number
  status: string
  invoiceNumber: string | null
  bookingId: string | null
  bookingNumber: string | null
  signedAt: string | null
  expectedReturnDate: string | null
  dueDate: string | null
}

const STATUS_KEYS: Record<string, string> = {
  PENDING_SIGNATURE: 'statusPending',
  SIGNED: 'statusSigned',
  ACTIVE: 'statusActive',
  FULFILLED: 'statusFulfilled',
  ENFORCED: 'statusEnforced',
  CANCELLED: 'statusCancelled',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING_SIGNATURE: 'outline',
  SIGNED: 'secondary',
  ACTIVE: 'default',
  FULFILLED: 'default',
  ENFORCED: 'destructive',
  CANCELLED: 'destructive',
}

function formatSar(value: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return d
  }
}

export default function PromissoryNotesPage() {
  const { t, dir } = useLocale()
  const { toast } = useToast()
  const [notes, setNotes] = useState<PromissoryNoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'All') params.set('status', statusFilter)
      params.set('limit', String(pageSize))
      params.set('offset', String((page - 1) * pageSize))

      const res = await fetch(`/api/admin/promissory-notes?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'فشل تحميل سندات الأمر')
      }
      const data = await res.json()
      setNotes(data.data || [])
      setTotal(data.total ?? 0)
    } catch (e) {
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('promissoryNote.admin.loadFailed'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page, pageSize, toast, t])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const statuses = ['All', 'SIGNED', 'ACTIVE', 'FULFILLED', 'ENFORCED', 'CANCELLED', 'PENDING_SIGNATURE']

  return (
    <div className="space-y-6" dir={dir}>
      <div>
        <h1 className="text-2xl font-bold">{t('promissoryNote.admin.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('promissoryNote.admin.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Button asChild size="sm">
            <Link href="/admin/promissory-notes/new">
              <Plus className="ml-2 h-4 w-4" />
              {t('promissoryNote.admin.addNew')}
            </Link>
          </Button>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('promissoryNote.admin.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadNotes()}
              className="pr-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label={t('promissoryNote.admin.filterByStatus')}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? t('promissoryNote.admin.all') : (STATUS_KEYS[s] ? t(`promissoryNote.admin.${STATUS_KEYS[s]}`) : s)}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={() => loadNotes()}>
            {t('promissoryNote.admin.search')}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('promissoryNote.admin.noteNumber')}</TableHead>
                  <TableHead>{t('promissoryNote.admin.debtor')}</TableHead>
                  <TableHead>{t('promissoryNote.admin.amount')}</TableHead>
                  <TableHead>{t('promissoryNote.admin.status')}</TableHead>
                  <TableHead>{t('promissoryNote.admin.booking')}</TableHead>
                  <TableHead>{t('promissoryNote.admin.signedAt')}</TableHead>
                  <TableHead>{t('promissoryNote.admin.returnDate')}</TableHead>
                  <TableHead className="text-left">{t('promissoryNote.admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      {t('promissoryNote.admin.noNotes')}
                    </TableCell>
                  </TableRow>
                ) : (
                  notes.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium">{n.noteNumber}</TableCell>
                      <TableCell>{n.debtorName}</TableCell>
                      <TableCell>{formatSar(n.amountSar)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[n.status] ?? 'outline'}>
                          {STATUS_KEYS[n.status] ? t(`promissoryNote.admin.${STATUS_KEYS[n.status]}`) : n.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {n.bookingId ? (
                          <Link
                            href={`/admin/bookings/${n.bookingId}`}
                            className="text-primary hover:underline"
                          >
                            {n.bookingNumber ?? n.bookingId}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{formatDate(n.signedAt)}</TableCell>
                      <TableCell>{formatDate(n.expectedReturnDate)}</TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/promissory-notes/${n.id}`} title={t('promissoryNote.admin.view')} aria-label={`${t('promissoryNote.admin.view')} ${n.noteNumber}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={`/api/promissory-notes/${n.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              title={t('promissoryNote.admin.downloadPdf')}
                              aria-label={`${t('promissoryNote.admin.downloadPdf')} ${n.noteNumber}`}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
