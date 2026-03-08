'use client'

import { useCompareStore } from '@/lib/stores/compare-store'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { X, GitCompare, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { isExternalImageUrl } from '@/lib/utils/image.utils'

export function CompareBar() {
  const { items, removeItem, clearAll } = useCompareStore()
  const router = useRouter()

  if (items.length < 2) return null

  return (
    <div className="fixed bottom-0 start-0 end-0 z-50 border-t border-border-light bg-white shadow-lg px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center gap-4">
        <div className="flex flex-1 items-center gap-3 overflow-x-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-surface-light px-3 py-2"
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  width={32}
                  height={32}
                  className="rounded object-cover"
                  unoptimized={isExternalImageUrl(item.image)}
                />
              ) : (
                <div className="h-8 w-8 rounded bg-border-light" />
              )}
              <span className="max-w-[100px] truncate text-sm font-medium">
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="text-text-muted hover:text-red-500"
                aria-label="إزالة من المقارنة"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 2 - items.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex h-[52px] w-[140px] shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border-light text-xs text-text-muted"
            >
              + أضف معدة
            </div>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-text-muted"
          >
            مسح الكل
          </Button>
          <Button
            size="sm"
            onClick={() =>
              router.push(`/compare?ids=${items.map((i) => i.id).join(',')}`)
            }
            className="gap-1.5"
          >
            <GitCompare className="h-4 w-4" />
            قارن ({items.length})
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
