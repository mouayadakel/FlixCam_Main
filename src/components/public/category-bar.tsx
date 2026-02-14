/**
 * Category bar – horizontal text links below main header.
 * Hidden on small; horizontal scroll on md+ or include in mobile nav.
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'

const CATEGORY_LINKS = [
  { href: '/equipment', key: 'nav.equipment' },
  { href: '/studios', key: 'nav.studios' },
  { href: '/packages', key: 'nav.packages' },
  { href: '/build-your-kit', key: 'nav.buildKit' },
  { href: '/how-it-works', key: 'nav.howItWorks' },
] as const

export function CategoryBar() {
  const { t } = useLocale()
  const pathname = usePathname()

  return (
    <nav
      className="hidden border-t border-border-light/50 bg-white/80 md:block"
      aria-label="Categories"
    >
      <div className="mx-auto flex w-full max-w-public-container items-center gap-1 overflow-x-auto px-4 py-1">
        {CATEGORY_LINKS.map(({ href, key }) => {
          const isActive = pathname ? (pathname === href || pathname.startsWith(href + '/')) : false
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'text-brand-primary bg-brand-primary/5'
                  : 'text-text-body hover:text-brand-primary hover:bg-brand-primary/5'
              )}
            >
              {t(key)}
              {isActive && (
                <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-brand-primary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
