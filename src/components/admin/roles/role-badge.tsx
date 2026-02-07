/**
 * @file role-badge.tsx
 * @description Colored badge for role display
 * @module components/admin/roles
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface RoleBadgeProps {
  name: string
  displayName?: string
  displayNameAr?: string | null
  color?: string | null
  className?: string
}

export function RoleBadge({
  name,
  displayName,
  displayNameAr,
  color,
  className,
}: RoleBadgeProps) {
  const label = displayNameAr || displayName || name
  const style = color
    ? { backgroundColor: `${color}20`, color: color, borderColor: `${color}40` }
    : undefined

  return (
    <Badge
      variant="outline"
      className={cn('font-medium', !color && 'bg-muted', className)}
      style={style}
    >
      {label}
    </Badge>
  )
}
