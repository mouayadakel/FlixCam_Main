/**
 * @file placeholder-card.tsx
 * @description Placeholder card for dashboard subpages (activity, quick-actions, etc.)
 * @module components/admin
 */

import { type ReactNode } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface PlaceholderCardProps {
  title: string
  description: string
  icon?: ReactNode
  /** Optional CTA to another admin page */
  actionLabel?: string
  actionHref?: string
}

export function PlaceholderCard({
  title,
  description,
  icon,
  actionLabel,
  actionHref,
}: PlaceholderCardProps) {
  return (
    <Card>
      <CardHeader>
        {icon && <div className="mb-2 text-muted-foreground [&_svg]:h-10 [&_svg]:w-10">{icon}</div>}
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {actionLabel && actionHref && (
          <Button variant="outline" asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
