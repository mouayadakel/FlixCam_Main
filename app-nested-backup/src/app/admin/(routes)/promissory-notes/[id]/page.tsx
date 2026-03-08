/**
 * Admin Promissory Note detail page – view, download PDF, enforce, fulfill
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowRight, Download, CheckCircle, AlertTriangle, Save } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface PromissoryNoteDetail {
  id: string
  noteNumber: string
  debtorName: string
  debtorPhone: string
  debtorEmail: string
  amountSar: number
  amountInWords: string
  status: string
  invoiceNumber: string | null
  bookingId: string | null
  signedAt: string | null
  expectedReturnDate: string | null
  dueDate: string | null
  enforcedAt: string | null
  enforcedReason: string | null
  fulfilledAt: string | null
  equipmentItems: Array<{ name: string; purchaseValue: number; quantity: number }> | null
  letterContent: string | null
  letterType: string | null
  letterPdfUrl: string | null
  booking?: { id: string; bookingNumber: string; status: string } | null
  debtor?: { id: string; name: string | null; email: string; phone: string | null } | null
}

const STATUS_KEYS: Record<string, string> = {
  PENDING_SIGNATURE: 'statusPending',
  SIGNED: 'statusSigned',
  ACTIVE: 'statusActive',
  FULFILLED: 'statusFulfilled',
  ENFORCED: 'statusEnforced',
  CANCELLED: 'statusCancelled',
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
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return d
  }
}

export default function PromissoryNoteDetailPage() {
  const params = useParams()
  const { t, dir } = useLocale()
  const { toast } = useToast()
  const id = params?.id as string
  const [note, setNote] = useState<PromissoryNoteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [enforceDialogOpen, setEnforceDialogOpen] = useState(false)
  const [enforceReason, setEnforceReason] = useState('')
  const [enforcing, setEnforcing] = useState(false)
  const [fulfilling, setFulfilling] = useState(false)
  const [letterType, setLetterType] = useState<'generated' | 'pdf'>('generated')
  const [letterContent, setLetterContent] = useState('')
  const [savingLetter, setSavingLetter] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/promissory-notes/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('فشل التحميل'))))
      .then((data) => {
        setNote(data)
        setLetterType((data.letterType === 'pdf' ? 'pdf' : 'generated') as 'generated' | 'pdf')
        setLetterContent(data.letterContent || '')
      })
      .catch((e) => {
        toast({
          title: t('common.error'),
          description: e instanceof Error ? e.message : t('promissoryNote.admin.loadFailed'),
          variant: 'destructive',
        })
      })
      .finally(() => setLoading(false))
  }, [id, toast, t])

  const handleEnforce = async () => {
    setEnforcing(true)
    try {
      const res = await fetch(`/api/admin/promissory-notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enforce', reason: enforceReason || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'فشل التنفيذ')
      setNote((prev) => (prev ? { ...prev, status: 'ENFORCED', enforcedAt: new Date().toISOString(), enforcedReason: enforceReason || null } : null))
      setEnforceDialogOpen(false)
      setEnforceReason('')
      toast({ title: t('common.done'), description: t('promissoryNote.admin.enforcedSuccess') })
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل التنفيذ',
        variant: 'destructive',
      })
    } finally {
      setEnforcing(false)
    }
  }

  const handleFulfill = async () => {
    setFulfilling(true)
    try {
      const res = await fetch(`/api/admin/promissory-notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fulfill' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'فشل الاستيفاء')
      setNote((prev) => (prev ? { ...prev, status: 'FULFILLED', fulfilledAt: new Date().toISOString() } : null))
      toast({ title: t('common.done'), description: t('promissoryNote.admin.fulfilledSuccess') })
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل الاستيفاء',
        variant: 'destructive',
      })
    } finally {
      setFulfilling(false)
    }
  }

  const handleSaveLetter = async () => {
    setSavingLetter(true)
    try {
      const res = await fetch(`/api/admin/promissory-notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateLetter', letterContent: letterContent.trim() || null, letterType }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ')
      setNote((prev) => (prev ? { ...prev, letterContent: letterContent.trim() || null, letterType } : null))
      toast({ title: t('common.done'), description: 'تم حفظ نص الخطاب' })
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل حفظ الخطاب',
        variant: 'destructive',
      })
    } finally {
      setSavingLetter(false)
    }
  }

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPdf(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/admin/promissory-notes/${id}/upload-pdf`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'فشل الرفع')
      setNote((prev) => (prev ? { ...prev, letterType: 'pdf', letterPdfUrl: data.letterPdfUrl } : null))
      setLetterType('pdf')
      toast({ title: t('common.done'), description: 'تم رفع ملف PDF' })
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'فشل رفع PDF',
        variant: 'destructive',
      })
    } finally {
      setUploadingPdf(false)
      e.target.value = ''
    }
  }

  const canEnforce = note && !['ENFORCED', 'FULFILLED', 'CANCELLED'].includes(note.status)
  const canFulfill = note && !['ENFORCED', 'FULFILLED', 'CANCELLED'].includes(note.status)

  if (loading || !note) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/promissory-notes">
            <ArrowRight className="ms-2 h-4 w-4" />
            {t('promissoryNote.admin.backToList')}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{t('promissoryNote.title')} {note.noteNumber}</h1>
        <p className="text-muted-foreground mt-1">
          {t('promissoryNote.admin.status')}: <span className="font-medium">{STATUS_KEYS[note.status] ? t(`promissoryNote.admin.${STATUS_KEYS[note.status]}`) : note.status}</span>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('promissoryNote.admin.debtorInfo')}</CardTitle>
            <CardDescription>{t('promissoryNote.admin.debtorInfoDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><span className="text-muted-foreground">{t('promissoryNote.admin.name')}:</span> {note.debtorName}</p>
            <p><span className="text-muted-foreground">{t('promissoryNote.admin.phone')}:</span> {note.debtorPhone || '—'}</p>
            <p><span className="text-muted-foreground">{t('promissoryNote.admin.email')}:</span> {note.debtorEmail || '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('promissoryNote.admin.amountAndDetails')}</CardTitle>
            <CardDescription>{t('promissoryNote.admin.amountAndDetailsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><span className="text-muted-foreground">{t('promissoryNote.admin.amount')}:</span> <span className="font-bold">{formatSar(note.amountSar)}</span></p>
            <p className="text-sm text-muted-foreground">{note.amountInWords}</p>
            <p><span className="text-muted-foreground">{t('promissoryNote.admin.invoiceNumber')}:</span> {note.invoiceNumber || '—'}</p>
            <p><span className="text-muted-foreground">{t('promissoryNote.admin.signedAtLabel')}:</span> {formatDate(note.signedAt)}</p>
            <p><span className="text-muted-foreground">{t('promissoryNote.expectedReturnDate')}:</span> {formatDate(note.expectedReturnDate)}</p>
            <p><span className="text-muted-foreground">{t('promissoryNote.admin.dueDate')}:</span> {formatDate(note.dueDate)}</p>
            {note.enforcedAt && (
              <p><span className="text-muted-foreground">{t('promissoryNote.admin.enforcedAt')}:</span> {formatDate(note.enforcedAt)}</p>
            )}
            {note.fulfilledAt && (
              <p><span className="text-muted-foreground">{t('promissoryNote.admin.fulfilledAt')}:</span> {formatDate(note.fulfilledAt)}</p>
            )}
            {note.enforcedReason && (
              <p><span className="text-muted-foreground">{t('promissoryNote.admin.enforceReason')}:</span> {note.enforcedReason}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {note.equipmentItems && note.equipmentItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('promissoryNote.admin.equipmentList')}</CardTitle>
            <CardDescription>{t('promissoryNote.admin.equipmentListDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1">
              {note.equipmentItems.map((it, i) => (
                <li key={i}>
                  {it.name} × {it.quantity}: {formatSar(it.purchaseValue * it.quantity)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {note.booking && (
        <Card>
          <CardHeader>
            <CardTitle>{t('promissoryNote.admin.relatedBooking')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="mt-2" asChild>
              <Link href={`/admin/bookings/${note.booking!.id}`}>
                {t('promissoryNote.admin.viewBooking').replace('{number}', note.booking!.bookingNumber)}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>نص خطاب سند الأمر</CardTitle>
          <CardDescription>تعديل النص أو رفع PDF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              type="button"
              variant={letterType === 'generated' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLetterType('generated')}
            >
              إنشاء سند
            </Button>
            <Button
              type="button"
              variant={letterType === 'pdf' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLetterType('pdf')}
            >
              رفع PDF
            </Button>
          </div>

          {letterType === 'generated' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="letter-content">نص الخطاب</Label>
                <Textarea
                  id="letter-content"
                  value={letterContent}
                  onChange={(e) => setLetterContent(e.target.value)}
                  placeholder="نص خطاب سند الأمر..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <Button size="sm" onClick={handleSaveLetter} disabled={savingLetter}>
                <Save className="ms-2 h-4 w-4" />
                {savingLetter ? 'جاري الحفظ...' : 'حفظ النص'}
              </Button>
            </>
          )}

          {letterType === 'pdf' && (
            <div className="space-y-2">
              <Label htmlFor="upload-pdf">رفع ملف PDF</Label>
              <Input
                id="upload-pdf"
                type="file"
                accept="application/pdf"
                onChange={handleUploadPdf}
                disabled={uploadingPdf}
              />
              {note.letterPdfUrl && (
                <p className="text-sm text-muted-foreground">تم رفع ملف PDF مسبقاً</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4">
        <Button variant="outline" asChild>
          <a href={`/api/promissory-notes/${note.id}/pdf`} target="_blank" rel="noopener noreferrer" download>
            <Download className="ms-2 h-4 w-4" />
            {t('promissoryNote.admin.downloadPdfBtn')}
          </a>
        </Button>
        {canEnforce && (
          <Button variant="destructive" onClick={() => setEnforceDialogOpen(true)}>
            <AlertTriangle className="ms-2 h-4 w-4" />
            {t('promissoryNote.admin.enforce')}
          </Button>
        )}
        {canFulfill && (
          <Button variant="default" onClick={handleFulfill} disabled={fulfilling}>
            <CheckCircle className="ms-2 h-4 w-4" />
            {fulfilling ? t('promissoryNote.admin.fulfilling') : t('promissoryNote.admin.fulfill')}
          </Button>
        )}
      </div>

      <Dialog open={enforceDialogOpen} onOpenChange={setEnforceDialogOpen}>
        <DialogContent className="sm:max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t('promissoryNote.admin.enforceDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('promissoryNote.admin.enforceDialogDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="enforce-reason">{t('promissoryNote.admin.enforceReason')} ({t('common.optional')})</Label>
              <Textarea
                id="enforce-reason"
                placeholder={t('promissoryNote.admin.enforceReasonPlaceholder')}
                value={enforceReason}
                onChange={(e) => setEnforceReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnforceDialogOpen(false)}>
              {t('promissoryNote.admin.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleEnforce} disabled={enforcing}>
              {enforcing ? t('promissoryNote.admin.enforcing') : t('promissoryNote.admin.enforceConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
