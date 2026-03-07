'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const PULL_THRESHOLD = 80
const MAX_PULL = 120

export interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

/**
 * Pull-to-refresh wrapper using touch events. Shows spinner at top when threshold met.
 */
function PullToRefresh({ onRefresh, children, className, disabled = false }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = React.useState(0)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const startY = React.useRef<number>(0)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return
      const scrollTop = containerRef.current?.scrollTop ?? window.scrollY
      if (scrollTop <= 0) {
        startY.current = e.touches[0].clientY
      }
    },
    [disabled, isRefreshing]
  )

  const handleTouchMove = React.useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return
      const scrollTop = containerRef.current?.scrollTop ?? window.scrollY
      if (scrollTop > 0) return
      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current
      if (diff > 0) {
        const distance = Math.min(diff * 0.5, MAX_PULL)
        setPullDistance(distance)
      }
    },
    [disabled, isRefreshing]
  )

  const handleTouchEnd = React.useCallback(async () => {
    if (disabled || isRefreshing) return
    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true)
      setPullDistance(0)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    } else {
      setPullDistance(0)
    }
  }, [disabled, isRefreshing, onRefresh, pullDistance])

  const showSpinner = pullDistance >= PULL_THRESHOLD || isRefreshing
  const pullHeight = Math.max(pullDistance, showSpinner ? 56 : 0)
  const pullOpacity = pullDistance > 0 || showSpinner ? 1 : 0
  const ariaBusy: 'true' | 'false' = isRefreshing ? 'true' : 'false'

  return (
    <div
      ref={containerRef}
      className={cn('-webkit-overflow-scrolling-touch relative overflow-y-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => setPullDistance(0)}
    >
      <div
        className="pull-to-refresh-indicator flex flex-col items-center justify-center transition-all duration-200"
        style={{
          ['--pull-height' as string]: `${pullHeight}px`,
          ['--pull-opacity' as string]: String(pullOpacity),
        }}
        aria-live="polite"
        aria-busy={ariaBusy}
      >
        {showSpinner && (
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden
          />
        )}
      </div>
      {children}
    </div>
  )
}

export { PullToRefresh }
