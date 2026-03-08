'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Package, DollarSign, Sparkles, AlertTriangle } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'

interface ImportSummaryProps {
  totalItems: number
  readyCount: number
  draftCount: number
  needsReviewCount: number
  categoryCount: number
  aiFilled: number
  estimatedCost?: number
  className?: string
}

export function ImportSummary({
  totalItems,
  readyCount,
  draftCount,
  needsReviewCount,
  categoryCount,
  aiFilled,
  estimatedCost,
  className,
}: ImportSummaryProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="text-center">
            <Package className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <p className="text-2xl font-bold">{totalItems}</p>
            <p className="text-xs text-muted-foreground">إجمالي المنتجات</p>
          </div>
          <div className="text-center">
            <p className="mb-2 text-xs text-muted-foreground">الحالة</p>
            <div className="flex flex-col items-center gap-1">
              <StatusBadge status="READY" />
              <span className="text-sm font-medium">{readyCount}</span>
            </div>
          </div>
          <div className="text-center">
            <Sparkles className="mx-auto mb-1 h-5 w-5 text-blue-600" />
            <p className="text-2xl font-bold text-blue-700">{aiFilled}</p>
            <p className="text-xs text-muted-foreground">تم ملؤها بالذكاء</p>
          </div>
          <div className="text-center">
            {estimatedCost !== undefined && (
              <>
                <DollarSign className="mx-auto mb-1 h-5 w-5 text-green-600" />
                <p className="text-2xl font-bold text-green-700">${estimatedCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">التكلفة المقدرة</p>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 border-t pt-3">
          <p className="text-center text-sm text-muted-foreground">
            {totalItems} منتج عبر {categoryCount} فئة. {readyCount > 0 && <>{readyCount} جاهز. </>}
            {draftCount > 0 && <>{draftCount} مسودة. </>}
            {needsReviewCount > 0 && (
              <span className="text-amber-600">{needsReviewCount} يحتاج مراجعة.</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
