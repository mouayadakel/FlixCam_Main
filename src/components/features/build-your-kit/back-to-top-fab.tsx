/**
 * Floating "back to top" button. Visible after scrolling 2+ viewport heights.
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SCROLL_THRESHOLD_VIEWPORTS = 2

export function BackToTopFab() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const check = () => {
      setVisible(window.scrollY >= SCROLL_THRESHOLD_VIEWPORTS * window.innerHeight)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!visible) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        'fixed bottom-24 end-4 z-30 h-12 w-12 rounded-full shadow-lg lg:bottom-8',
        'animate-in fade-in slide-in-from-bottom-4 duration-300'
      )}
      onClick={scrollToTop}
      aria-label="Back to top"
    >
      <ChevronUp className="h-6 w-6" />
    </Button>
  )
}
