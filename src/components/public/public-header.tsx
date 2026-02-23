/**
 * Public website header – clean single-bar layout.
 * One sticky bar: logo, nav links, “المزيد” dropdown, then CTAs (search, language, cart, login/register).
 * Sticky with subtle scroll state. Mobile: hamburger, search in dialog.
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { useAuthModalOptional } from '@/components/auth/auth-modal-provider'
import { Search, ChevronDown } from 'lucide-react'
import { PublicContainer } from './public-container'
import { LanguageSwitcher } from './language-switcher'
import { PublicSearch } from './public-search'
import { MiniCart } from './mini-cart'
import { MobileNav } from './mobile-nav'
import { NotificationBell } from './notification-bell'
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

const MAIN_LINKS = [
  { href: '/', key: 'nav.home' as const },
  { href: '/equipment', key: 'nav.equipment' as const },
  { href: '/studios', key: 'nav.studios' as const },
  { href: '/packages', key: 'nav.packages' as const },
] as const

const MORE_LINKS = [
  { href: '/about', key: 'nav.about' as const },
  { href: '/faq', key: 'nav.faq' as const },
  { href: '/terms', key: 'nav.policies' as const },
] as const

interface PublicHeaderProps {
  hiddenRoutes?: Set<string>
}

export function PublicHeader({ hiddenRoutes }: PublicHeaderProps = {}) {
  const { t } = useLocale()
  const pathname = usePathname()
  const authModal = useAuthModalOptional()
  const [scrolled, setScrolled] = useState(false)
  const [logoError, setLogoError] = useState(false)

  const mainLinks = hiddenRoutes?.size
    ? MAIN_LINKS.filter(({ href }) => !hiddenRoutes.has(href))
    : MAIN_LINKS
  const moreLinks = hiddenRoutes?.size
    ? MORE_LINKS.filter(({ href }) => !hiddenRoutes.has(href))
    : MORE_LINKS

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full font-header-nav transition-[box-shadow,background-color] duration-300',
        'border-b border-white/[0.06] bg-header-surface/95 text-white backdrop-blur-md',
        'min-h-[72px]',
        scrolled && 'border-white/[0.08] bg-header-surface shadow-header-scrolled'
      )}
    >
      <div className="overflow-x-auto">
        <PublicContainer>
          <nav
            className="flex min-h-[72px] min-w-max items-center justify-between gap-6 py-3 md:gap-8"
            aria-label="Main navigation"
          >
            {/* Logo: first in DOM so RTL puts it on the right; order-last in LTR so it stays on the right */}
            <Link
              href="/"
              className="group order-last flex shrink-0 flex-col items-end rounded-sm pe-4 text-end transition-opacity hover:opacity-90 focus:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-header-surface sm:pe-6 md:pe-8 rtl:order-first rtl:items-start rtl:pe-0 rtl:ps-4 rtl:text-start rtl:sm:ps-6 rtl:md:ps-8"
              aria-label={siteConfig.brandName}
            >
              <span
                className="header-logo-bg relative flex h-9 w-[120px] shrink-0 items-center justify-end bg-[length:200%_100%] bg-[position:100%_0] bg-no-repeat md:h-10 md:w-[130px] rtl:justify-start"
                style={{
                  ['--header-logo-url' as string]: logoError
                    ? 'none'
                    : `url(${siteConfig.logoInverted})`,
                }}
              >
                {!logoError && (
                  <Image
                    src={siteConfig.logoInverted}
                    alt=""
                    width={120}
                    height={40}
                    className="absolute inset-0 h-0 w-0 overflow-hidden opacity-0"
                    onError={() => setLogoError(true)}
                  />
                )}
                {logoError ? (
                  <span className="text-lg font-bold tracking-tight text-white">
                    {siteConfig.brandName}
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-widest text-white/40 md:block">
                {siteConfig.tagline}
              </span>
            </Link>

            {/* Nav + CTAs block */}
            <div className="flex flex-1 items-center justify-end gap-5 lg:gap-10">
              {/* Desktop nav links */}
              <ul className="hidden items-center gap-7 lg:flex">
                {mainLinks.map(({ href, key }) => {
                  const isActive =
                    pathname !== null &&
                    (pathname === href || (href !== '/' && pathname.startsWith(href)))
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={cn(
                          'group/link relative block rounded-sm py-2 text-[15px] font-medium text-white/85 outline-none transition-colors hover:text-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-brand-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-header-surface',
                          isActive && 'text-brand-primary'
                        )}
                      >
                        {t(key)}
                        <span
                          className={cn(
                            'absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-primary transition-all duration-200',
                            isActive ? 'opacity-100' : 'opacity-0 group-hover/link:opacity-100'
                          )}
                          aria-hidden
                        />
                      </Link>
                    </li>
                  )
                })}
                {/* المزيد dropdown */}
                <li className="group/dd relative">
                  <span
                    className="flex cursor-pointer items-center gap-1 rounded-sm py-2 text-[15px] font-medium text-white/85 outline-none transition-colors hover:text-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-brand-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-header-surface"
                    tabIndex={0}
                    aria-label={t('nav.more')}
                  >
                    {t('nav.more')}
                    <ChevronDown
                      className="h-4 w-4 shrink-0 transition-transform group-focus-within/dd:rotate-180 group-hover/dd:rotate-180"
                      aria-hidden
                    />
                  </span>
                  <div className="invisible absolute right-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-white/10 bg-header-dropdown py-1.5 opacity-0 shadow-xl transition-[opacity,visibility] duration-200 group-focus-within/dd:visible group-focus-within/dd:opacity-100 group-hover/dd:visible group-hover/dd:opacity-100">
                    {moreLinks.map(({ href, key }) => (
                      <Link
                        key={href}
                        href={href}
                        className="block rounded-lg px-4 py-2.5 text-sm text-white/90 transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white focus:outline-none"
                      >
                        {t(key)}
                      </Link>
                    ))}
                  </div>
                </li>
              </ul>

              {/* CTA group: search (mobile), language, notification, cart, auth */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="md:hidden">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('common.search')}
                        className="h-10 w-10 rounded-full text-white/90 transition-colors hover:bg-white/10 hover:text-white"
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
                <div className="hidden items-center gap-2 lg:flex">
                  <LanguageSwitcher />
                  <NotificationBell />
                  <MiniCart />
                  <span className="mx-1 h-5 w-px bg-white/20" aria-hidden />
                  {authModal ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => authModal.openAuthModal('login')}
                        className="h-9 font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        {t('nav.login')}
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 rounded-lg bg-brand-primary px-5 font-semibold text-[#1A1A1A] transition-colors hover:bg-brand-primary-hover"
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
                        className="hidden h-9 font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
                      >
                        <Link href="/login">{t('nav.login')}</Link>
                      </Button>
                      <Button
                        size="sm"
                        asChild
                        className="h-9 rounded-lg bg-brand-primary px-5 font-semibold text-[#1A1A1A] transition-colors hover:bg-brand-primary-hover"
                      >
                        <Link href="/register">{t('nav.register')}</Link>
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 lg:hidden">
                  <NotificationBell />
                  <MiniCart />
                  <MobileNav hiddenRoutes={hiddenRoutes} />
                </div>
              </div>
            </div>
          </nav>
        </PublicContainer>
      </div>
    </header>
  )
}
