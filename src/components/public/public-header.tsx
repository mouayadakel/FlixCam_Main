/**
 * Public website header - fixed, with logo, nav, language, cart, account (Phase 1.5).
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { LanguageSwitcher } from './language-switcher'
import { PublicNav } from './public-nav'
import { MiniCart } from './mini-cart'
import { MobileNav } from './mobile-nav'
import { Button } from '@/components/ui/button'

export function PublicHeader() {
  const { t } = useLocale()

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">FlixCam.rent</span>
        </Link>

        <PublicNav className="hidden md:flex" />

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />
            <MiniCart />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">{t('nav.login')}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">{t('nav.register')}</Link>
            </Button>
          </div>
          <div className="md:hidden">
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  )
}
