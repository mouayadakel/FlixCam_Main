'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const SWIPE_THRESHOLD = 60

export interface SwipeActionItemProps {
  children: React.ReactNode
  /** Actions revealed on swipe-left (e.g. Delete). Rendered in a row at the end. */
  actions: React.ReactNode
  className?: string
}

/**
 * Swipe-left-to-reveal-actions for list items (e.g. cart item delete, booking cancel).
 * Uses touch events; shows action buttons behind the main content.
 */
function SwipeActionItem({ children, actions, className }: SwipeActionItemProps) {
  const [offset, setOffset] = React.useState(0)
  const [swipeDirection, setSwipeDirection] = React.useState(-1)
  const startX = React.useRef(0)
  const currentX = React.useRef(0)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setSwipeDirection(
      typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? 1 : -1
    )
  }, [])

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    currentX.current = e.touches[0].clientX
  }, [])

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    currentX.current = e.touches[0].clientX
    const diff = startX.current - currentX.current
    // Swipe left (reveal actions): positive diff in LTR, negative in RTL
    const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
    const swipe = isRtl ? -diff : diff
    if (swipe > 0) {
      setOffset(Math.min(swipe, SWIPE_THRESHOLD * 2))
    } else {
      setOffset(0)
    }
  }, [])

  const handleTouchEnd = React.useCallback(() => {
    if (offset >= SWIPE_THRESHOLD) {
      setOffset(SWIPE_THRESHOLD)
    } else {
      setOffset(0)
    }
  }, [offset])

  const content = (
    <>
      <div
        className={cn(
          'absolute inset-y-0 flex items-center justify-end',
          'rtl:left-0 rtl:right-auto rtl:justify-start'
        )}
      >
        <div className="flex h-full items-stretch">{actions}</div>
      </div>
      <div
        className="swipe-content relative z-10 bg-background transition-transform duration-150"
        style={{
          ['--swipe-offset' as string]: `${offset}px`,
          ['--swipe-direction' as string]: String(swipeDirection),
        }}
      >
        {children}
      </div>
    </>
  )

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => setOffset(0)}
    >
      {content}
    </div>
  )
}

export { SwipeActionItem }
