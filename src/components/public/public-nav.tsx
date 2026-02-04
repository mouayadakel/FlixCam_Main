/**
 * Public site navigation links (Phase 1.5).
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'

interface PublicNavProps {
  className?: string
  onLinkClick?: () => void
}

const NAV_LINKS = [
  { href: '/', key: 'nav.home' },
  { href: '/equipment', key: 'nav.equipment' },
  { href: '/studios', key: 'nav.studios' },
  { href: '/packages', key: 'nav.packages' },
  { href: '/build-your-kit', key: 'nav.buildKit' },
  { href: '/how-it-works', key: 'nav.howItWorks' },
  { href: '/support', key: 'nav.support' },
] as const

export function PublicNav({ className, onLinkClick }: PublicNavProps) {
  const { t } = useLocale()

  return (
    <nav className={cn('flex items-center gap-6', className)} aria-label="Main navigation">
      {NAV_LINKS.map(({ href, key }) => (
        <Link
          key={href}
          href={href}
          onClick={onLinkClick}
          className="text-sm font-medium text-foreground/90 hover:text-foreground transition-colors"
        >
          {t(key)}
        </Link>
      ))}
    </nav>
  )
}
