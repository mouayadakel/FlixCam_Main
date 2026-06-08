import { Badge } from '@/components/ui/badge'
import {
  getStatusLabel,
  getStatusVariant,
  type StatusLabelEntry,
} from '@/lib/constants/status-labels'

type LabeledStatusBadgeProps = {
  value: string
  labels: Record<string, StatusLabelEntry>
  locale?: 'ar' | 'en'
  className?: string
}

export function LabeledStatusBadge({
  value,
  labels,
  locale = 'ar',
  className,
}: LabeledStatusBadgeProps) {
  return (
    <Badge variant={getStatusVariant(labels, value)} className={className}>
      {getStatusLabel(labels, value, locale)}
    </Badge>
  )
}
