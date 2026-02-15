/**
 * Public website header – top bar (contact + language), main bar (logo, search, nav, actions).
 * Sticky with backdrop blur on scroll. Mobile: hamburger, search icon opens overlay.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { useAuthModalOptional } from '@/components/auth/auth-modal-provider'
import { Search } from 'lucide-react'
import { PublicContainer } from './public-container'
import { LanguageSwitcher } from './language-switcher'
import { PublicNav } from './public-nav'
import { PublicSearch } from './public-search'
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
import { siteConfig } from '@/config/site.config'
import { cn } from '@/lib/utils'

interface PublicHeaderProps {
  hiddenRoutes?: Set<string>
}

export function PublicHeader({ hiddenRoutes }: PublicHeaderProps = {}) {
  const { t } = useLocale()
  const authModal = useAuthModalOptional()
  const { phone, email } = siteConfig.contact
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-300',
        scrolled
          ? 'glass-heavy shadow-header-scrolled'
          : 'bg-white/95 shadow-header'
      )}
    >
      {/* Top bar – contact + language; hidden on small */}
      <div
        className={cn(
          'hidden border-b border-border-light/60 md:block transition-all duration-300 overflow-hidden',
          scrolled ? 'max-h-0 opacity-0 border-b-0' : 'max-h-12 opacity-100'
        )}
      >
        <PublicContainer>
          <div className="flex h-9 items-center justify-between text-label-small uppercase tracking-wider text-text-muted">
            <span className="flex items-center gap-3">
              <a
                href={`tel:${phone.replace(/\s/g, '')}`}
                className="transition-colors hover:text-brand-primary"
              >
                {phone}
              </a>
              <span className="h-3 w-px bg-border-light" />
              <a
                href={`mailto:${email}`}
                className="transition-colors hover:text-brand-primary"
              >
                {email}
              </a>
            </span>
            <LanguageSwitcher />
          </div>
        </PublicContainer>
      </div>

      {/* Main bar – overflow-x-auto ensures auth buttons are reachable when content overflows (RTL) */}
      <div className="overflow-x-auto">
        <PublicContainer>
          <div className="flex h-16 min-w-max items-center gap-4 md:gap-8">
            {/* Logo */}
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
            >
              <span className="text-xl font-bold tracking-tight text-text-heading">
                {siteConfig.brandName}
              </span>
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
                    className="text-text-heading hover:bg-brand-primary/5 hover:text-brand-primary rounded-full transition-colors"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[420px]" aria-describedby={undefined}>
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

            <PublicNav className="hidden flex-shrink-0 md:flex" hiddenRoutes={hiddenRoutes} />

            {/* Auth actions – ms-auto keeps them at end (visible in RTL) */}
            <div className="ms-auto flex flex-shrink-0 items-center gap-1.5">
              <div className="hidden md:flex md:items-center md:gap-1.5">
                <LanguageSwitcher />
                <MiniCart />
                {authModal ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => authModal.openAuthModal('login')}
                      className="text-text-body hover:text-text-heading hover:bg-transparent font-medium transition-colors"
                    >
                      {t('nav.login')}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-brand-primary hover:bg-brand-primary-hover rounded-lg px-5 font-semibold shadow-sm transition-all hover:shadow-md"
                      onClick={() => authModal.openAuthModal('register')}
                    >
                      {t('nav.register')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-text-body hover:text-text-heading hover:bg-transparent font-medium transition-colors"
                    >
                      <Link href="/login">{t('nav.login')}</Link>
                    </Button>
                    <Button
                      size="sm"
                      className="bg-brand-primary hover:bg-brand-primary-hover rounded-lg px-5 font-semibold shadow-sm transition-all hover:shadow-md"
                      asChild
                    >
                      <Link href="/register">{t('nav.register')}</Link>
                    </Button>
                  </>
                )}
              </div>
              <div className="md:hidden flex items-center gap-1">
                <MiniCart />
                <MobileNav hiddenRoutes={hiddenRoutes} />
              </div>
            </div>
          </div>
        </PublicContainer>
      </div>
    </header>
  )
}
