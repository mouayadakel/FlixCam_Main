/**
 * Callout block - info, warning, success, error.
 */

import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

const VARIANTS = {
  info: {
    icon: Info,
    borderClass: 'border-blue-500',
    bgClass: 'bg-blue-50',
    iconClass: 'text-blue-600',
  },
  warning: {
    icon: AlertTriangle,
    borderClass: 'border-amber-500',
    bgClass: 'bg-amber-50',
    iconClass: 'text-amber-600',
  },
  success: {
    icon: CheckCircle,
    borderClass: 'border-green-500',
    bgClass: 'bg-green-50',
    iconClass: 'text-green-600',
  },
  error: {
    icon: XCircle,
    borderClass: 'border-red-500',
    bgClass: 'bg-red-50',
    iconClass: 'text-red-600',
  },
} as const

interface CalloutProps {
  variant: 'info' | 'warning' | 'success' | 'error'
  title?: string
  content: string
}

export function CalloutBlock({ variant, title, content }: CalloutProps) {
  const config = VARIANTS[variant] ?? VARIANTS.info
  const Icon = config.icon
  return (
    <div
      className={`my-6 flex gap-3 rounded-lg border-s-4 ${config.borderClass} ${config.bgClass} p-4`}
      role="note"
    >
      <Icon className={`h-5 w-5 shrink-0 ${config.iconClass}`} aria-hidden />
      <div>
        {title && <p className="mb-1 font-semibold text-gray-900">{title}</p>}
        <p className="text-gray-700">{content}</p>
      </div>
    </div>
  )
}
