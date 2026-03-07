/**
 * Public site container: max-width 1320px, centered, horizontal padding.
 * Use for section content to match design token container_max_width.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PublicContainerProps {
  children: ReactNode
  className?: string
}

export function PublicContainer({ children, className }: PublicContainerProps) {
  return (
    <div className={cn('mx-auto w-full max-w-public-container px-4 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  )
}
