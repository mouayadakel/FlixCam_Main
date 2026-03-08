/**
 * @file content-review-tab.tsx
 * @description Review pending AI text/spec/photo drafts with approve/reject + confidence badges
 * @module app/admin/(routes)/ai-dashboard/_components
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import {
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Image as ImageIcon,
  Settings2,
  Sparkles,
  Eye,
  ChevronDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfidenceBadge } from '@/components/shared/confidence-badge'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

const REJECTION_REASONS = [
  { value: 'inaccurate', label: 'محتوى غير دقيق' },
  { value: 'wrong_locale', label: 'لغة خاطئة' },
  { value: 'too_generic', label: 'عام جداً' },
  { value: 'factually_incorrect', label: 'خطأ واقعي' },
  { value: 'formatting', label: 'مشاكل تنسيق' },
  { value: 'other', label: 'أخرى' },
]

interface DraftItem {
  id: string
  productId: string
  type: string
  suggestedData: Record<string, unknown>
  status: string
  createdAt: string
  product: {
    id: string
    sku: string | null
    translations: Array<{ name: string }>
  }
}

function InlineConfidenceBadge({ value }: { value: number }) {
  return <ConfidenceBadge confidence={value} size="sm" />
}

function DraftPreview({ draft }: { draft: DraftItem }) {
  const data = draft.suggestedData
  if (draft.type === 'text') {
    const genEn = data.generatedEnDescription as
      | { shortDescription?: string; longDescription?: string }
      | undefined
    const seo = data.seo as { metaTitle?: string; metaDescription?: string } | undefined
    const translations = data.translations as
      | Record<string, { name?: string; shortDescription?: string }>
      | undefined
    const confidence = data.confidence as Record<string, number> | undefined

    return (
      <div className="space-y-3 text-sm" dir="rtl">
        {genEn?.shortDescription && (
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="font-medium text-muted-foreground">وصف قصير (EN)</span>
              {confidence?.shortDescription && (
                <InlineConfidenceBadge value={confidence.shortDescription} />
              )}
            </div>
            <p className="rounded bg-muted/50 p-2 text-xs" dir="ltr">
              {genEn.shortDescription}
            </p>
          </div>
        )}
        {seo?.metaTitle && (
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="font-medium text-muted-foreground">عنوان SEO</span>
              {confidence?.seoTitle && <InlineConfidenceBadge value={confidence.seoTitle} />}
            </div>
            <p className="rounded bg-muted/50 p-2 text-xs" dir="ltr">
              {seo.metaTitle}
            </p>
          </div>
        )}
        {translations &&
          Object.entries(translations).map(([locale, t]) => (
            <div key={locale}>
              <span className="font-medium text-muted-foreground">
                {locale === 'ar' ? 'العربية' : locale === 'zh' ? '中文' : locale.toUpperCase()}
              </span>
              {t?.name && (
                <p
                  className="mt-1 rounded bg-muted/50 p-2 text-xs"
                  dir={locale === 'ar' ? 'rtl' : 'ltr'}
                >
                  {t.name}
                </p>
              )}
            </div>
          ))}
        {data.boxContents != null && String(data.boxContents).trim() !== '' && (
          <div>
            <span className="font-medium text-muted-foreground">محتويات الصندوق</span>
            <p className="mt-1 rounded bg-muted/50 p-2 text-xs" dir="ltr">
              {String(data.boxContents)}
            </p>
          </div>
        )}
        {data.tags != null && String(data.tags).trim() !== '' && (
          <div>
            <span className="font-medium text-muted-foreground">الوسوم</span>
            <p className="mt-1 rounded bg-muted/50 p-2 text-xs" dir="ltr">
              {String(data.tags)}
            </p>
          </div>
        )}
      </div>
    )
  }

  if (draft.type === 'spec') {
    const specs = data.specifications as Record<string, unknown> | undefined
    const specResults = data.specResults as
      | Array<{ key: string; value: unknown; confidence: number }>
      | undefined
    return (
      <div className="space-y-2 text-sm">
        {specResults
          ? specResults.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between rounded bg-muted/50 p-2"
              >
                <span className="font-medium">{s.key}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">{String(s.value)}</span>
                  <InlineConfidenceBadge value={s.confidence} />
                </div>
              </div>
            ))
          : specs
            ? Object.entries(specs).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded bg-muted/50 p-2">
                  <span className="font-medium">{k}</span>
                  <span className="text-xs">{String(v)}</span>
                </div>
              ))
            : null}
      </div>
    )
  }

  if (draft.type === 'photo') {
    const images = data.galleryImages as string[] | undefined
    return (
      <div className="grid grid-cols-3 gap-2">
        {images?.slice(0, 6).map((url, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded bg-muted">
            <Image
              src={url}
              alt={`صورة ${i + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 33vw, 200px"
              unoptimized={url.startsWith('blob:')}
            />
          </div>
        ))}
      </div>
    )
  }

  return <p className="text-sm text-muted-foreground">معاينة غير متاحة</p>
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  text: FileText,
  spec: Settings2,
  photo: ImageIcon,
}

const TYPE_LABELS: Record<string, string> = {
  text: 'نص ووصف',
  spec: 'مواصفات فنية',
  photo: 'صور',
}

export function ContentReviewTab() {
  const { toast } = useToast()
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [previewDraft, setPreviewDraft] = useState<DraftItem | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActing, setBulkActing] = useState(false)

  const fetchDrafts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai/drafts')
      if (!res.ok) throw new Error('فشل تحميل المسودات')
      const data = await res.json()
      setDrafts(data.drafts ?? [])
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل تحميل المسودات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchDrafts()
  }, [fetchDrafts])

  const handleAction = async (
    id: string,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ) => {
    setActingId(id)
    try {
      const body: Record<string, string> = {}
      if (rejectionReason) body.rejectionReason = rejectionReason
      const res = await fetch(`/api/admin/ai/drafts/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل التنفيذ')
      toast({ title: action === 'approve' ? 'تمت الموافقة' : 'تم الرفض' })
      setDrafts((prev) => prev.filter((d) => d.id !== id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      if (previewDraft?.id === id) setPreviewDraft(null)
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل التنفيذ',
        variant: 'destructive',
      })
    } finally {
      setActingId(null)
    }
  }

  const handleBulkAction = async (action: 'approve' | 'reject', rejectionReason?: string) => {
    if (selectedIds.size === 0) return
    setBulkActing(true)
    const ids = Array.from(selectedIds)
    let successCount = 0
    for (const id of ids) {
      try {
        const body: Record<string, string> = {}
        if (rejectionReason) body.rejectionReason = rejectionReason
        const res = await fetch(`/api/admin/ai/drafts/${id}/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          successCount++
          setDrafts((prev) => prev.filter((d) => d.id !== id))
        }
      } catch {
        /* continue with remaining */
      }
    }
    setSelectedIds(new Set())
    setBulkActing(false)
    toast({
      title: `${action === 'approve' ? 'تمت الموافقة على' : 'تم رفض'} ${successCount} من ${ids.length}`,
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((d) => d.id)))
    }
  }

  const filtered = typeFilter === 'all' ? drafts : drafts.filter((d) => d.type === typeFilter)
  const typeCounts = {
    text: drafts.filter((d) => d.type === 'text').length,
    spec: drafts.filter((d) => d.type === 'spec').length,
    photo: drafts.filter((d) => d.type === 'photo').length,
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6" dir="rtl">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{drafts.length}</p>
                  <p className="text-xs text-muted-foreground">في انتظار المراجعة</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {(['text', 'spec', 'photo'] as const).map((t) => {
            const Icon = TYPE_ICONS[t]
            return (
              <Card key={t}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{typeCounts[t]}</p>
                      <p className="text-xs text-muted-foreground">{TYPE_LABELS[t]}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Draft list */}
        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>مسودات المحتوى</CardTitle>
                <CardDescription>
                  راجع واعتمد أو ارفض مقترحات الذكاء الاصطناعي قبل النشر
                </CardDescription>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل ({drafts.length})</SelectItem>
                  <SelectItem value="text">نص ({typeCounts.text})</SelectItem>
                  <SelectItem value="spec">مواصفات ({typeCounts.spec})</SelectItem>
                  <SelectItem value="photo">صور ({typeCounts.photo})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filtered.length > 0 && (
              <div className="flex items-center gap-3 border-t pt-3">
                <Checkbox
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-xs text-muted-foreground">تحديد الكل</span>
                {selectedIds.size > 0 && (
                  <div className="me-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={bulkActing}
                      onClick={() => handleBulkAction('approve')}
                    >
                      {bulkActing ? (
                        <Loader2 className="ms-1 h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="ms-1 h-3 w-3" />
                      )}
                      اعتماد المحدد ({selectedIds.size})
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" disabled={bulkActing}>
                          <XCircle className="ms-1 h-3 w-3" />
                          رفض المحدد ({selectedIds.size})
                          <ChevronDown className="me-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {REJECTION_REASONS.map((reason) => (
                          <DropdownMenuItem
                            key={reason.value}
                            onClick={() => handleBulkAction('reject', reason.value)}
                          >
                            {reason.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-green-300 bg-green-50/50 py-16 text-center">
                <CheckCircle className="mb-4 h-12 w-12 text-green-500" />
                <p className="text-lg font-medium text-green-700">
                  لا توجد مسودات في انتظار المراجعة
                </p>
                <p className="mt-1 text-sm text-green-600">جميع المحتوى تم مراجعته</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((draft) => {
                  const Icon = TYPE_ICONS[draft.type] ?? FileText
                  const productName =
                    draft.product?.translations?.[0]?.name ?? draft.product?.sku ?? draft.productId
                  return (
                    <div
                      key={draft.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
                    >
                      <Checkbox
                        checked={selectedIds.has(draft.id)}
                        onCheckedChange={() => toggleSelect(draft.id)}
                        className="shrink-0"
                      />
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                          <Icon className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{productName}</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {TYPE_LABELS[draft.type] ?? draft.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(draft.createdAt), 'dd/MM HH:mm', { locale: arSA })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setPreviewDraft(draft)}>
                          <Eye className="ms-1 h-4 w-4" />
                          معاينة
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={actingId === draft.id}
                          onClick={() => handleAction(draft.id, 'approve')}
                        >
                          {actingId === draft.id ? (
                            <Loader2 className="ms-1 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="ms-1 h-4 w-4" />
                          )}
                          اعتماد
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" disabled={actingId === draft.id}>
                              {actingId === draft.id ? (
                                <Loader2 className="ms-1 h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="ms-1 h-4 w-4" />
                              )}
                              رفض
                              <ChevronDown className="me-1 h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {REJECTION_REASONS.map((reason) => (
                              <DropdownMenuItem
                                key={reason.value}
                                onClick={() => handleAction(draft.id, 'reject', reason.value)}
                              >
                                {reason.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewDraft} onOpenChange={(open) => !open && setPreviewDraft(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              معاينة مسودة —{' '}
              {previewDraft?.product?.translations?.[0]?.name ?? previewDraft?.product?.sku}
            </DialogTitle>
            <DialogDescription>
              {previewDraft && (
                <Badge variant="secondary">
                  {TYPE_LABELS[previewDraft.type] ?? previewDraft.type}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>
          {previewDraft && <DraftPreview draft={previewDraft} />}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => previewDraft && handleAction(previewDraft.id, 'reject')}
              disabled={!previewDraft || actingId === previewDraft?.id}
            >
              <XCircle className="ms-1 h-4 w-4" />
              رفض
            </Button>
            <Button
              onClick={() => previewDraft && handleAction(previewDraft.id, 'approve')}
              disabled={!previewDraft || actingId === previewDraft?.id}
            >
              <CheckCircle className="ms-1 h-4 w-4" />
              اعتماد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
