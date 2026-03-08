/**
 * @file table-pagination.tsx
 * @description Reusable table pagination with Previous/Next, page size selector, and "Showing X-Y of Z"
 * @module components/tables
 */

'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100]

interface TablePaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  /** Optional label override, e.g. "حجز" for "Showing 1-10 of 50 حجز" */
  itemLabel?: string
  /** RTL layout */
  dir?: 'rtl' | 'ltr'
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  itemLabel = '',
  dir = 'ltr',
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  const showingText =
    dir === 'rtl'
      ? `عرض ${start}-${end} من ${total}${itemLabel ? ` ${itemLabel}` : ''}`
      : `Showing ${start}-${end} of ${total}${itemLabel ? ` ${itemLabel}` : ''}`

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4" dir={dir}>
      <div className="text-sm text-muted-foreground">{showingText}</div>
      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {dir === 'rtl' ? 'لكل صفحة:' : 'Per page:'}
            </span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            aria-label={dir === 'rtl' ? 'السابق' : 'Previous'}
          >
            {dir === 'rtl' ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
          <span className="px-3 text-sm text-muted-foreground">
            {dir === 'rtl' ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            aria-label={dir === 'rtl' ? 'التالي' : 'Next'}
          >
            {dir === 'rtl' ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
