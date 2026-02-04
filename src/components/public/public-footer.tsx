/**
 * Public website footer - links, contact, copyright (Phase 1.5).
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'

const FOOTER_LINKS = [
  { href: '/equipment', key: 'nav.equipment' },
  { href: '/studios', key: 'nav.studios' },
  { href: '/packages', key: 'nav.packages' },
  { href: '/how-it-works', key: 'nav.howItWorks' },
  { href: '/support', key: 'nav.support' },
  { href: '/policies', key: 'nav.policies' },
] as const

export function PublicFooter() {
  const { t } = useLocale()

  return (
    <footer className="border-t bg-muted/30">
      <div className="container px-4 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">{t('footer.links')}</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {FOOTER_LINKS.map(({ href, key }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-foreground transition-colors">
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">{t('footer.contact')}</p>
            <a href="https://wa.me/966500000000" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              WhatsApp
            </a>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} FlixCam.rent — {t('footer.copyright')}
        </p>
      </div>
    </footer>
  )
}
