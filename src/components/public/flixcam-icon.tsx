/**
 * FLIXCAM graphical mark – stylized F / film camera icon.
 * Lime green (#8DC63F) on dark background. Left: vertical bar with cutout; right: two angled trapezoids.
 */

import { cn } from '@/lib/utils'

const BRAND_GREEN = '#8DC63F'

interface FlixcamIconProps {
  className?: string
  width?: number
  height?: number
}

export function FlixcamIcon({ className, width = 40, height = 40 }: FlixcamIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 40 40"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      {/* Left: vertical bar with bottom-left cutout (film canister / camera body) */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 0 0 L 10 0 L 10 40 L 0 40 Z M 2 28 L 8 28 L 8 34 L 2 34 Z"
        fill={BRAND_GREEN}
      />
      {/* Right: two angled trapezoids (film strips / lens flare) */}
      <path
        d="M 16 10 L 40 6 L 40 12 L 16 16 Z"
        fill={BRAND_GREEN}
      />
      <path
        d="M 16 28 L 40 24 L 40 30 L 16 34 Z"
        fill={BRAND_GREEN}
      />
    </svg>
  )
}
