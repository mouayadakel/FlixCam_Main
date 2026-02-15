/**
 * Public site navigation links (Phase 1.5).
 * Used in main header (desktop) and mobile nav drawer.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'

interface PublicNavProps {
  className?: string
  onLinkClick?: () => void
  hiddenRoutes?: Set<string>
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

export function PublicNav({ className, onLinkClick, hiddenRoutes }: PublicNavProps) {
  const { t } = useLocale()
  const pathname = usePathname()
  const visibleLinks =
    hiddenRoutes?.size ? NAV_LINKS.filter(({ href }) => !hiddenRoutes.has(href)) : NAV_LINKS

  return (
    <nav className={cn('flex items-center gap-6', className)} aria-label="Main navigation">
      {visibleLinks.map(({ href, key }) => {
        const isActive =
          pathname !== null &&
          (pathname === href || (href !== '/' && pathname.startsWith(href)))
        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            className={cn(
              'text-sm font-medium transition-colors',
              isActive
                ? 'text-brand-primary font-semibold'
                : 'text-foreground/90 hover:text-foreground'
            )}
          >
            {t(key)}
          </Link>
        )
      })}
    </nav>
  )
}
