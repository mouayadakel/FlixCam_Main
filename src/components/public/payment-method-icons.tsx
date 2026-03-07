/**
 * Payment method icons for footer (Visa, Mastercard, Mada, Cash).
 * Simple SVG representations for display only.
 */

import { Banknote } from 'lucide-react'

interface PaymentIconProps {
  className?: string
  size?: number
  title?: string
}

const defaultSize = 32

export function VisaIcon({ className, size = defaultSize, title = 'Visa' }: PaymentIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 24"
      width={size}
      height={size * (24 / 36)}
      className={className}
      aria-hidden
      role="img"
    >
      <title>{title}</title>
      <rect width="36" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.85" />
      <rect x="6" y="10" width="12" height="2" rx="1" fill="currentColor" opacity="0.85" />
    </svg>
  )
}

export function MastercardIcon({ className, size = defaultSize, title = 'Mastercard' }: PaymentIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
      role="img"
    >
      <title>{title}</title>
      <circle cx="9" cy="12" r="6" fill="currentColor" opacity="0.7" />
      <circle cx="15" cy="12" r="6" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

export function MadaIcon({ className, size = defaultSize, title = 'Mada' }: PaymentIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 24"
      width={size}
      height={size * (24 / 36)}
      className={className}
      aria-hidden
      role="img"
    >
      <title>{title}</title>
      <rect width="36" height="24" rx="3" fill="currentColor" opacity="0.88" />
      <rect x="6" y="8" width="24" height="3" rx="1" fill="white" opacity="0.9" />
    </svg>
  )
}

function CashIcon({ className, size = defaultSize, title = 'Cash' }: PaymentIconProps) {
  return <Banknote className={className} size={size} aria-hidden role="img" aria-label={title} />
}

const PAYMENT_ICONS: Record<string, React.ComponentType<PaymentIconProps>> = {
  visa: VisaIcon,
  mc: MastercardIcon,
  mastercard: MastercardIcon,
  mada: MadaIcon,
  cash: CashIcon,
}

export function getPaymentIcon(name: string): React.ComponentType<PaymentIconProps> | null {
  const key = name.toLowerCase().trim()
  return PAYMENT_ICONS[key] ?? null
}

export const PAYMENT_METHODS = [
  { id: 'visa', label: 'Visa', Icon: VisaIcon },
  { id: 'mc', label: 'Mastercard', Icon: MastercardIcon },
  { id: 'mada', label: 'Mada', Icon: MadaIcon },
  { id: 'cash', label: 'Cash', Icon: CashIcon },
] as const
