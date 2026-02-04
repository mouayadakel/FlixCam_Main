/**
 * @file empty-state.tsx
 * @description Empty state component with optional icon and Next.js Link
 * @module components/states
 */

import { type ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  /** Optional icon (e.g. Package, Inbox, FileText) */
  icon?: ReactNode
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  /** Minimal height for consistent layout */
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  actionHref,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center min-h-[200px] ${className}`}
      role="status"
      aria-label={title}
    >
      {icon && <div className="mb-3 text-muted-foreground [&_svg]:h-12 [&_svg]:w-12">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>
      {actionLabel && (actionHref || onAction) && (
        <div className="mt-4">
          {actionHref ? (
            <Button asChild>
              <Link href={actionHref}>
                <Plus className="mr-2 h-4 w-4" />
                {actionLabel}
              </Link>
            </Button>
          ) : (
            <Button onClick={onAction}>
              <Plus className="mr-2 h-4 w-4" />
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
