/**
 * FLIXCAM wordmark – brand design with two-color split.
 * F, L, C, A, M in brand green (#8DC63F); I, X in white.
 * Used on dark header (right in LTR, left in RTL).
 */

import { cn } from '@/lib/utils'

interface FlixcamWordmarkProps {
  className?: string
  /** Height in pixels (24, 28, or 32); uses Tailwind text size. */
  height?: 24 | 28 | 32
  /** Text color for I,X on dark bg; green for F,L,C,A,M. */
  variant?: 'dark-bg' | 'light-bg'
}

const HEIGHT_CLASSES: Record<number, string> = {
  24: 'text-2xl',
  28: 'text-[28px]',
  32: 'text-3xl',
}

export function FlixcamWordmark({
  className,
  height = 28,
  variant = 'dark-bg',
}: FlixcamWordmarkProps) {
  const accentColor = variant === 'dark-bg' ? 'text-white' : 'text-[#1A1A1A]'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 font-english font-extrabold uppercase leading-none tracking-tight',
        HEIGHT_CLASSES[height] ?? 'text-[28px]',
        className
      )}
      aria-hidden
    >
      <span className="text-brand-primary">F</span>
      <span className="text-brand-primary">L</span>
      <span className={accentColor}>I</span>
      <span className={accentColor}>X</span>
      <span className="text-brand-primary">C</span>
      <span className="text-brand-primary">A</span>
      <span className="text-brand-primary">M</span>
    </span>
  )
}
