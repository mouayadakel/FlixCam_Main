/**
 * @file image-review-tab.tsx
 * @description Grid of AI-generated images pending review; approve/reject with keyboard + lightbox
 * @module app/admin/(routes)/ai-dashboard/_components
 */

'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import { CheckCircle, XCircle, ImageIcon, Loader2, Camera } from 'lucide-react'

const ALLOWED_IMAGE_HOSTS = ['res.cloudinary.com', 'placehold.co', 'localhost']
function isAllowedImageUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname
    return ALLOWED_IMAGE_HOSTS.some((allowed) => h === allowed || h.endsWith(`.${allowed}`))
  } catch {
    return false
  }
}

function PendingImage({
  src,
  alt,
  fill,
  className,
  sizes,
}: {
  src: string
  alt: string
  fill?: boolean
  className?: string
  sizes?: string
}) {
  const [error, setError] = useState(false)
  const unoptimized = !isAllowedImageUrl(src)
  if (error) {
    return (
      <div
        className={
          fill
            ? `absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground ${className ?? ''}`
            : undefined
        }
        style={fill ? undefined : { minHeight: 120 }}
      >
        <ImageIcon className="h-8 w-8" />
      </div>
    )
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      unoptimized={unoptimized}
      onError={() => setError(true)}
    />
  )
}
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'

interface PendingImageItem {
  id: string
  url: string
  imageSource: string
  qualityScore: number | null
  productId: string
  productName: string
  createdAt: string
}

export function ImageReviewTab() {
  const { toast } = useToast()
  const [items, setItems] = useState<PendingImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [bulkActing, setBulkActing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterProductId, setFilterProductId] = useState<string>('all')
  const [lightboxImage, setLightboxImage] = useState<PendingImageItem | null>(null)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState<{ total: number; totalPages: number; limit: number } | null>(
    null
  )

  const lightboxRef = useRef<PendingImageItem | null>(null)
  lightboxRef.current = lightboxImage

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (filterProductId && filterProductId !== 'all') params.set('productId', filterProductId)
      const res = await fetch(`/api/admin/ai/pending-images?${params.toString()}`)
      if (!res.ok) throw new Error('فشل تحميل الصور')
      const data = await res.json()
      setItems(data.items ?? [])
      setMeta(data.meta ?? null)
      setSelectedIds(new Set())
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل تحميل قائمة الصور',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast, filterProductId, page])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    setPage(1)
  }, [filterProductId])

  const handleAction = useCallback(
    async (id: string, action: 'approve' | 'reject') => {
      setActingId(id)
      try {
        const res = await fetch(`/api/admin/ai/pending-images/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'فشل التنفيذ')
        toast({
          title: action === 'approve' ? 'تمت الموافقة' : 'تم الرفض',
          description: data.message,
        })
        setItems((prev) => prev.filter((i) => i.id !== id))
        if (lightboxRef.current?.id === id) setLightboxImage(null)
      } catch (e) {
        toast({
          title: 'خطأ',
          description: e instanceof Error ? e.message : 'فشل التنفيذ',
          variant: 'destructive',
        })
      } finally {
        setActingId(null)
      }
    },
    [toast]
  )

  // Keyboard shortcuts — only fire when lightbox is open, skip if target is interactive
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const current = lightboxRef.current
      if (!current) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        handleAction(current.id, 'approve')
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        handleAction(current.id, 'reject')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleAction])

  const [allProductOptions, setAllProductOptions] = useState<
    Array<[string, { name: string; count: number }]>
  >([])

  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const res = await fetch('/api/admin/ai/pending-images?limit=500&page=1')
        if (!res.ok) return
        const data = await res.json()
        const allItems: PendingImageItem[] = data.items ?? []
        const map = new Map<string, { name: string; count: number }>()
        allItems.forEach((i) => {
          const existing = map.get(i.productId)
          if (existing) existing.count++
          else map.set(i.productId, { name: i.productName, count: 1 })
        })
        setAllProductOptions(Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count))
      } catch {
        /* non-critical */
      }
    }
    fetchFilterOptions()
  }, [])

  const productOptions = allProductOptions

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(items.map((i) => i.id)))
  }

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      toast({ title: 'اختر صوراً', variant: 'destructive' })
      return
    }
    setBulkActing(true)
    try {
      const res = await fetch('/api/admin/ai/pending-images/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'فشل التنفيذ')
      toast({
        title: action === 'approve' ? 'تمت الموافقة على المحدد' : 'تم رفض المحدد',
        description: data.message,
      })
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)))
      setSelectedIds(new Set())
    } catch (e) {
      toast({
        title: 'خطأ',
        description: e instanceof Error ? e.message : 'فشل التنفيذ',
        variant: 'destructive',
      })
    } finally {
      setBulkActing(false)
    }
  }

  const handleLightboxClose = useCallback((open: boolean) => {
    if (!open) setLightboxImage(null)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>مراجعة الصور</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>مراجعة الصور المُنشأة بالذكاء الاصطناعي</CardTitle>
          <p className="text-sm text-muted-foreground">
            {meta?.total === 0 || (items.length === 0 && !meta)
              ? 'لا توجد صور في انتظار المراجعة'
              : `${meta?.total ?? items.length} صورة في انتظار المراجعة`}
          </p>
          {items.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              A للموافقة | R للرفض | Space للتحديد (عند فتح الصورة)
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:gap-4">
            <Select value={filterProductId} onValueChange={setFilterProductId}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="المنتج" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المنتجات</SelectItem>
                {productOptions.map(([id, { name, count }]) => (
                  <SelectItem key={id} value={id}>
                    {name} ({count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {items.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.size === items.length && items.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">تحديد الكل</span>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={bulkActing || selectedIds.size === 0}
                    onClick={() => handleBulkAction('approve')}
                    className="flex-1 sm:flex-none"
                  >
                    {bulkActing && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
                    <CheckCircle className="ml-1 h-4 w-4" />
                    موافقة ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkActing || selectedIds.size === 0}
                    onClick={() => handleBulkAction('reject')}
                    className="flex-1 sm:flex-none"
                  >
                    {bulkActing && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
                    <XCircle className="ml-1 h-4 w-4" />
                    رفض ({selectedIds.size})
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-green-300 bg-green-50/50 py-16 text-center">
              <Camera className="mb-4 h-12 w-12 text-green-500" />
              <p className="text-lg font-medium text-green-700">لا توجد صور في انتظار المراجعة</p>
              <p className="mt-1 text-sm text-green-600">جميع الصور تمت مراجعتها ✓</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {items.map((img) => (
                <div
                  key={img.id}
                  className="space-y-2 rounded-lg border bg-card p-3"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    const tag = (e.target as HTMLElement)?.tagName
                    if (tag === 'INPUT' || tag === 'TEXTAREA') return
                    if (e.key === ' ') {
                      e.preventDefault()
                      toggleSelect(img.id)
                    }
                    if (e.key === 'a' || e.key === 'A') {
                      e.preventDefault()
                      handleAction(img.id, 'approve')
                    }
                    if (e.key === 'r' || e.key === 'R') {
                      e.preventDefault()
                      handleAction(img.id, 'reject')
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.has(img.id)}
                      onCheckedChange={() => toggleSelect(img.id)}
                    />
                    <button
                      type="button"
                      aria-label={`عرض صورة ${img.productName}`}
                      className="relative aspect-square min-w-0 flex-1 cursor-pointer overflow-hidden rounded-md bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      onClick={() => setLightboxImage(img)}
                    >
                      <PendingImage
                        src={img.url}
                        alt={img.productName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </button>
                  </div>
                  <p className="truncate text-sm font-medium" title={img.productName}>
                    {img.productName}
                  </p>
                  {img.qualityScore != null && (
                    <p className="text-xs text-muted-foreground">
                      جودة: {Math.round(img.qualityScore * 100)}%
                    </p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      disabled={actingId === img.id}
                      onClick={() => handleAction(img.id, 'approve')}
                    >
                      {actingId === img.id ? (
                        <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="ml-1 h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">موافقة</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={actingId === img.id}
                      onClick={() => handleAction(img.id, 'reject')}
                    >
                      {actingId === img.id ? (
                        <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="ml-1 h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">رفض</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                السابق
              </Button>
              <span className="text-sm text-muted-foreground">
                صفحة {page} من {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                التالي
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox dialog — stable onOpenChange via useCallback */}
      <Dialog open={!!lightboxImage} onOpenChange={handleLightboxClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{lightboxImage?.productName}</DialogTitle>
          </DialogHeader>
          {lightboxImage && (
            <div className="space-y-4">
              <div className="relative h-[60vh] max-h-[600px] min-h-[280px] w-full overflow-hidden rounded-lg bg-muted">
                <PendingImage
                  src={lightboxImage.url}
                  alt={lightboxImage.productName}
                  fill
                  className="object-contain"
                  sizes="95vw"
                />
              </div>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  {lightboxImage.qualityScore != null && (
                    <p>جودة: {Math.round(lightboxImage.qualityScore * 100)}%</p>
                  )}
                  <p>
                    التاريخ:{' '}
                    {format(new Date(lightboxImage.createdAt), 'dd/MM/yyyy HH:mm', {
                      locale: arSA,
                    })}
                  </p>
                </div>
                <p className="text-xs">A للموافقة | R للرفض</p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={actingId === lightboxImage.id}
                  onClick={() => handleAction(lightboxImage.id, 'approve')}
                >
                  {actingId === lightboxImage.id ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="ml-2 h-4 w-4" />
                  )}
                  موافقة
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={actingId === lightboxImage.id}
                  onClick={() => handleAction(lightboxImage.id, 'reject')}
                >
                  {actingId === lightboxImage.id ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="ml-2 h-4 w-4" />
                  )}
                  رفض
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
