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
      className="hidden border-t border-border-light bg-white md:block"
      aria-label="Categories"
    >
      <div className="mx-auto flex w-full max-w-public-container items-center gap-6 overflow-x-auto px-4 py-2">
        {CATEGORY_LINKS.map(({ href, key }) => {
          const isActive = pathname ? (pathname === href || pathname.startsWith(href + '/')) : false
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'whitespace-nowrap text-sm font-medium transition-colors',
                isActive
                  ? 'text-brand-primary'
                  : 'text-text-body hover:text-text-heading'
              )}
            >
              {t(key)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
