'use client'

import * as React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: React.ReactNode
  /** Optional height class for mobile (e.g. max-h-[80vh]). Default: max-h-[85vh] */
  className?: string
}

/**
 * Mobile slide-up drawer for filters, actions, detail panels.
 * Uses Shadcn Sheet with side="bottom". RTL-aware (close button positioned with end-4).
 */
function BottomSheet({ open, onOpenChange, title, children, className }: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'flex max-h-[85vh] flex-col rounded-t-2xl pb-[env(safe-area-inset-bottom)] pt-4',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          '[&>button]:end-4 [&>button]:right-auto [&>button]:min-h-[44px] [&>button]:min-w-[44px]',
          className
        )}
      >
        {title && (
          <SheetHeader className="flex-shrink-0 px-4 text-start">
            <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
          </SheetHeader>
        )}
        <div className="-webkit-overflow-scrolling-touch min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { BottomSheet }
