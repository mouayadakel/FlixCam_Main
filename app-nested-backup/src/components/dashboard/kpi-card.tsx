/**
 * @file kpi-card.tsx
 * @description KPI card component for dashboard metrics
 * @module components/dashboard
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  trend?: string
  trendDirection?: 'up' | 'down' | 'neutral'
  icon?: React.ComponentType<{ className?: string }>
  description?: string
}

export function KPICard({
  title,
  value,
  trend,
  trendDirection = 'neutral',
  icon: Icon,
  description,
}: KPICardProps) {
  const TrendIcon =
    trendDirection === 'up' ? ArrowUp : trendDirection === 'down' ? ArrowDown : Minus

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" dir="rtl">
        <CardTitle className="text-sm font-medium text-neutral-600">{title}</CardTitle>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
            <Icon className="h-4 w-4 text-primary-600" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-neutral-900">{value}</div>
        {trend && (
          <p
            className={cn(
              'mt-2 flex items-center gap-1 text-xs',
              trendDirection === 'up' && 'text-success-600',
              trendDirection === 'down' && 'text-error-600',
              trendDirection === 'neutral' && 'text-neutral-600'
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {trend}
          </p>
        )}
        {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}
      </CardContent>
    </Card>
  )
}
