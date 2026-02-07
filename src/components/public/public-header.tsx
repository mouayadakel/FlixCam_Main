/**
 * Public website header – top bar (contact + language), main bar (logo, search, nav, actions),
 * category bar. Mobile: hamburger, search icon opens overlay.
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Search } from 'lucide-react'
import { PublicContainer } from './public-container'
import { LanguageSwitcher } from './language-switcher'
import { PublicNav } from './public-nav'
import { PublicSearch } from './public-search'
import { CategoryBar } from './category-bar'
import { MiniCart } from './mini-cart'
import { MobileNav } from './mobile-nav'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function PublicHeader() {
  const { t } = useLocale()

  return (
    <header className="sticky top-0 z-40 w-full bg-white">
      {/* Top bar – contact + language; hidden on small */}
      <div className="hidden border-b border-border-light bg-surface-light md:block">
        <PublicContainer>
          <div className="flex h-9 items-center justify-between text-label-small uppercase tracking-wide text-text-muted">
            <span>
              <a
                href={`tel:${t('footer.phoneNumber').replace(/\s/g, '')}`}
                className="hover:text-text-heading"
              >
                {t('footer.phoneNumber')}
              </a>
              <span className="mx-2">|</span>
              <a
                href={`mailto:${t('footer.emailAddress')}`}
                className="hover:text-text-heading"
              >
                {t('footer.emailAddress')}
              </a>
            </span>
            <LanguageSwitcher />
          </div>
        </PublicContainer>
      </div>

      {/* Main bar */}
      <div className="border-b border-border-light">
        <PublicContainer>
          <div className="flex h-14 min-w-0 items-center gap-3 md:gap-6">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 font-semibold text-text-heading"
            >
              <span className="text-lg">FlixCam.rent</span>
            </Link>

            {/* Search – center on md+, icon on small */}
            <div className="hidden flex-1 justify-center md:flex">
              <PublicSearch />
            </div>
            <div className="md:hidden">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('common.search')}
                    className="text-text-heading hover:bg-surface-light"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]" aria-describedby={undefined}>
                  <DialogHeader>
                    <DialogTitle id="mobile-search-title" className="sr-only">
                      {t('common.search')}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="pt-2">
                    <PublicSearch />
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <PublicNav className="hidden flex-shrink-0 md:flex" />

            <div className="flex flex-shrink-0 items-center gap-2">
              <div className="hidden md:flex md:items-center md:gap-2">
                <LanguageSwitcher />
                <MiniCart />
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">{t('nav.login')}</Link>
                </Button>
                <Button size="sm" className="bg-brand-primary hover:bg-brand-primary-hover" asChild>
                  <Link href="/register">{t('nav.register')}</Link>
                </Button>
              </div>
              <div className="md:hidden">
                <MiniCart />
                <MobileNav />
              </div>
            </div>
          </div>
        </PublicContainer>
      </div>

      <CategoryBar />
    </header>
  )
}
