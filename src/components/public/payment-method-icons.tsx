/**
 * Payment method icons for footer (Visa, Mastercard, Mada, Cash).
 * Uses local SVG assets for consistent colored brand rendering.
 */

import Image from 'next/image'

interface PaymentIconProps {
  className?: string
  size?: number
  title?: string
}

const defaultSize = 32

function PaymentLogo({
  className,
  size = defaultSize, // visual height in px
  title,
  src,
}: PaymentIconProps & { src: string }) {
  const style = {
    height: `${size}px`,
    width: 'auto',
  }

  return (
    <Image
      src={src}
      alt={title ?? ''}
      width={72}
      height={28}
      className={className}
      aria-hidden
      style={style}
      unoptimized
    />
  )
}

export function VisaIcon({ className, size = defaultSize, title = 'Visa' }: PaymentIconProps) {
  return <PaymentLogo src="/payment-logos/visa.svg" className={className} size={size} title={title} />
}

export function MastercardIcon({ className, size = defaultSize, title = 'Mastercard' }: PaymentIconProps) {
  return <PaymentLogo src="/payment-logos/mastercard.svg" className={className} size={size} title={title} />
}

export function MadaIcon({ className, size = defaultSize, title = 'Mada' }: PaymentIconProps) {
  return <PaymentLogo src="/payment-logos/mada.svg" className={className} size={size} title={title} />
}

function CashIcon({ className, size = defaultSize, title = 'Cash' }: PaymentIconProps) {
  return <PaymentLogo src="/payment-logos/cash.svg" className={className} size={size} title={title} />
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
