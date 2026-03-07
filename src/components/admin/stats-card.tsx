/**
 * @file stats-card.tsx
 * @description Stats card component
 * @module components/admin
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MockStat } from '@/lib/utils/mock-data'

interface StatsCardProps {
  stat: MockStat
}

export function StatsCard({ stat }: StatsCardProps) {
  const Icon = stat.trend === 'up' ? ArrowUp : stat.trend === 'down' ? ArrowDown : Minus

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stat.value}</div>
        {stat.change && (
          <p
            className={cn(
              'flex items-center gap-1 text-xs',
              stat.trend === 'up' && 'text-green-600',
              stat.trend === 'down' && 'text-red-600',
              stat.trend === 'neutral' && 'text-gray-600'
            )}
          >
            <Icon className="h-3 w-3" />
            {stat.change}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
