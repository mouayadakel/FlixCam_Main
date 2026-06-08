/**
 * Public website header – clean single-bar layout.
 * One sticky bar: logo, nav links, “المزيد” dropdown, then CTAs (search, language, cart, login/register).
 * Sticky with subtle scroll state. Mobile: hamburger, search in dialog.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useLocale } from '@/hooks/use-locale'
import { useAuthModalOptional } from '@/components/auth/auth-modal-provider'
import { Search, ChevronDown, User, LogOut, LayoutDashboard } from 'lucide-react'
import { PublicContainer } from './public-container'
import { EquipmentNavDropdown } from './equipment-nav-dropdown'
import { LanguageSwitcher } from './language-switcher'
import { PublicSearch } from './public-search'
import { MiniCart } from './mini-cart'
import { MobileNav } from './mobile-nav'
import { NotificationBell } from './notification-bell'
import { useBranding } from '@/hooks/use-branding'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { siteConfig } from '@/config/site.config'
import { cn } from '@/lib/utils'
import { getDashboardPath } from '@/lib/auth/dashboard-routing'

const MAIN_LINKS = [
  { href: '/', key: 'nav.home' as const },
  { href: '/equipment', key: 'nav.equipment' as const },
  { href: '/studios', key: 'nav.studios' as const },
  { href: '/packages', key: 'nav.packages' as const },
  { href: '/blog', key: 'nav.blog' as const },
] as const

const MORE_LINKS = [
  { href: '/about', key: 'nav.about' as const },
  { href: '/contact', key: 'nav.contact' as const },
  { href: '/faq', key: 'nav.faq' as const },
  { href: '/terms', key: 'nav.policies' as const },
] as const

interface PublicHeaderProps {
  hiddenRoutes?: Set<string>
}

export function PublicHeader({ hiddenRoutes }: PublicHeaderProps = {}) {
  const { t, dir } = useLocale()
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const authModal = useAuthModalOptional()
  const { logoUrl } = useBranding()
  const [scrolled, setScrolled] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const isAuthenticated = status === 'authenticated' && !!session?.user

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
      <PublicContainer>
        <nav
          dir={dir}
          className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 py-3 md:gap-6"
          aria-label="Main navigation"
        >
            {/* Logo – start (left in LTR, right in RTL) */}
            <Link
              href="/"
              className="flex shrink-0 items-center transition-opacity hover:opacity-90 focus:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-header-surface"
              aria-label={siteConfig.brandName}
            >
              <Image
                src={logoUrl || "/images/flixcam-logo.avif"}
                alt={siteConfig.brandName}
                width={180}
                height={56}
                className="h-12 w-auto object-contain md:h-14"
                style={{ width: '171px', height: 'auto' }}
                priority
              />
            </Link>

            {/* Center: navigation links */}
            <div className="flex flex-1 basis-0 items-center justify-center">
              <ul className="hidden items-center gap-7 lg:flex">
                {mainLinks.map(({ href, key }) => {
                  const isActive =
                    pathname !== null &&
                    (pathname === href || (href !== '/' && pathname.startsWith(href)))
                  if (href === '/equipment') {
                    return (
                      <li key={href}>
                        <EquipmentNavDropdown
                          isActive={isActive}
                          triggerClassName={cn(
                            'block rounded-sm py-2 text-[15px] font-medium text-white/85 outline-none transition-colors hover:text-white focus-visible:text-white focus-visible:ring-2 focus-visible:ring-brand-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-header-surface',
                            isActive && 'text-brand-primary'
                          )}
                        />
                      </li>
                    )
                  }
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
                  <div className="invisible absolute start-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-white/10 bg-header-dropdown py-1.5 opacity-0 shadow-xl transition-[opacity,visibility] duration-200 group-focus-within/dd:visible group-focus-within/dd:opacity-100 group-hover/dd:visible group-hover/dd:opacity-100">
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
            </div>

            {/* CTAs – end (right in LTR, left in RTL): Cart, Account, Language */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('common.search')}
                      className="h-10 w-10 rounded-full text-white/90 transition-colors hover:bg-white/10 hover:text-white lg:h-9 lg:w-9"
                    >
                      <Search className="h-5 w-5 lg:h-4.5 lg:w-4.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="top-[max(0.5rem,env(safe-area-inset-top))] max-h-[calc(100dvh-1rem-env(safe-area-inset-top))] w-[calc(100vw-1.5rem)] max-w-[28rem] translate-y-0 overflow-y-auto overflow-x-visible rounded-2xl border border-border-light bg-background p-0 shadow-2xl"
                    aria-describedby={undefined}
                  >
                    <DialogHeader className="border-b border-border-light px-5 pb-3 pt-5">
                      <DialogTitle className="text-base font-semibold text-text-heading">
                        {t('header.searchEquipment')}
                      </DialogTitle>
                      <DialogDescription className="text-sm text-text-muted">
                        {t('header.searchPlaceholder')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="px-5 pb-5 pt-3">
                      <PublicSearch
                        mode="dialog"
                        autoFocus
                        onNavigate={() => setMobileSearchOpen(false)}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
                <div className="hidden items-center gap-2 lg:flex">
                  <MiniCart />
                  <NotificationBell />
                  <span className="mx-1 h-5 w-px bg-white/20" aria-hidden />
                  {isAuthenticated ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 gap-2 font-medium text-[rgba(140,198,63,1)] transition-colors hover:bg-white/10 hover:text-[rgba(140,198,63,1)]"
                        >
                          <User className="h-4 w-4" />
                          <span className="max-w-[120px] truncate">
                            {session.user.name || session.user.email}
                          </span>
                          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-48 border-white/10 bg-header-dropdown text-white"
                      >
                        <DropdownMenuLabel className="text-xs text-white/50">
                          {session.user.email}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem asChild className="cursor-pointer text-white/90 focus:bg-white/10 focus:text-white">
                          <Link
                            href={getDashboardPath(
                              session.user.role as string | undefined,
                              session.user.assignedRoles
                            )}
                          >
                            <LayoutDashboard className="me-2 h-4 w-4" />
                            {t('nav.dashboard')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer text-white/90 focus:bg-white/10 focus:text-white">
                          <Link href="/portal/dashboard">
                            <User className="me-2 h-4 w-4" />
                            {t('nav.account')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          onClick={() => signOut({ callbackUrl: '/' })}
                          className="cursor-pointer text-white/90 focus:bg-white/10 focus:text-white"
                        >
                          <LogOut className="me-2 h-4 w-4" />
                          {t('nav.signOut')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : authModal ? (
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
                        <Link href={`/login${pathname ? `?callbackUrl=${encodeURIComponent(pathname)}` : ''}`}>{t('nav.login')}</Link>
                      </Button>
                      <Button
                        size="sm"
                        asChild
                        className="h-9 rounded-lg bg-brand-primary px-5 font-semibold text-[#1A1A1A] transition-colors hover:bg-brand-primary-hover"
                      >
                        <Link href={`/register${pathname ? `?callbackUrl=${encodeURIComponent(pathname)}` : ''}`}>{t('nav.register')}</Link>
                      </Button>
                    </>
                  )}
                  <span className="mx-1 h-5 w-px bg-white/20" aria-hidden />
                  <LanguageSwitcher />
                </div>
                <div className="flex items-center gap-1 lg:hidden">
                  <LanguageSwitcher />
                  <NotificationBell />
                  <MiniCart />
                  <MobileNav hiddenRoutes={hiddenRoutes} />
                </div>
              </div>
            </div>
          </nav>
        </PublicContainer>
    </header>
  )
}
