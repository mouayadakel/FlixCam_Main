'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfidenceBadge } from '@/components/shared/confidence-badge'
import { CheckCircle2, Edit, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ReviewRow {
  id: string
  rowNumber: number
  name: string
  brand: string
  price: number | null
  aiDescription?: string
  aiConfidence?: number
  imageCount: number
  status: 'READY' | 'DRAFT' | 'NEEDS_REVIEW'
  categoryName?: string
}

type LocaleView = 'en' | 'ar' | 'zh'

interface ReviewGridProps {
  rows: ReviewRow[]
  onApproveSelected?: (ids: string[]) => void
  onEditRow?: (id: string) => void
  className?: string
}

export function ReviewGrid({ rows, onApproveSelected, onEditRow, className }: ReviewGridProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [locale, setLocale] = useState<LocaleView>('en')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const allSelected = selected.size === rows.length && rows.length > 0

  const handleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map((r) => r.id)))
    }
  }

  const handleToggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelected(next)
  }

  const counts = useMemo(() => {
    const ready = rows.filter((r) => r.status === 'READY').length
    const draft = rows.filter((r) => r.status === 'DRAFT').length
    const review = rows.filter((r) => r.status === 'NEEDS_REVIEW').length
    return { ready, draft, review }
  }, [rows])

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">مراجعة المنتجات</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              {(['en', 'ar', 'zh'] as LocaleView[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium transition-colors',
                    locale === l
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {l === 'en' ? 'EN' : l === 'ar' ? 'AR' : 'ZH'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
            <span className="text-xs text-muted-foreground">تحديد الكل</span>
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && onApproveSelected && (
              <Button size="sm" onClick={() => onApproveSelected(Array.from(selected))}>
                <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
                اعتماد المحدد ({selected.size})
              </Button>
            )}
            <Badge variant="outline" className="text-xs">
              {counts.ready} جاهز • {counts.draft} مسودة • {counts.review} مراجعة
            </Badge>
          </div>
        </div>

        <div className="space-y-1">
          <div className="grid grid-cols-[32px_1fr_100px_80px_120px_80px] gap-2 border-b px-2 pb-1 text-xs font-medium text-muted-foreground">
            <span />
            <span>المنتج</span>
            <span>السعر</span>
            <span>الصور</span>
            <span>وصف AI</span>
            <span>الحالة</span>
          </div>

          {rows.map((row) => (
            <div key={row.id}>
              <div
                className={cn(
                  'grid cursor-pointer grid-cols-[32px_1fr_100px_80px_120px_80px] items-center gap-2 rounded-md px-2 py-2 hover:bg-muted/50',
                  row.status === 'NEEDS_REVIEW' && 'border-r-2 border-r-amber-400 bg-amber-50',
                  row.status === 'DRAFT' && 'bg-muted/20',
                  selected.has(row.id) && 'bg-primary/5'
                )}
                onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
              >
                <Checkbox
                  checked={selected.has(row.id)}
                  onCheckedChange={() => handleToggle(row.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.brand}</p>
                </div>
                <span className="text-sm">
                  {row.price ? (
                    `${row.price} SAR`
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </span>
                <span
                  className={cn(
                    'text-xs',
                    row.imageCount < 4 ? 'font-medium text-amber-600' : 'text-green-600'
                  )}
                >
                  {row.imageCount}/4
                </span>
                <div className="min-w-0">
                  {row.aiDescription ? (
                    <div className="flex items-center gap-1">
                      <span className="truncate text-xs">{row.aiDescription.slice(0, 30)}...</span>
                      {row.aiConfidence && (
                        <ConfidenceBadge
                          confidence={row.aiConfidence}
                          showLabel={false}
                          size="sm"
                        />
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">--</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={row.status} size="sm" />
                  {expandedRow === row.id ? (
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </div>

              {expandedRow === row.id && (
                <div className="mx-8 mb-2 space-y-2 rounded-md border bg-muted/30 p-3">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">الفئة:</span>{' '}
                      <span>{row.categoryName || '--'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الصور:</span>{' '}
                      <span className={row.imageCount < 4 ? 'text-amber-600' : ''}>
                        {row.imageCount} صور
                      </span>
                    </div>
                  </div>
                  {row.aiDescription && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">
                        وصف AI ({locale.toUpperCase()}):
                      </span>
                      <p className="mt-1">{row.aiDescription}</p>
                    </div>
                  )}
                  {onEditRow && (
                    <Button variant="outline" size="sm" onClick={() => onEditRow(row.id)}>
                      <Edit className="ml-1 h-3 w-3" />
                      تعديل
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
