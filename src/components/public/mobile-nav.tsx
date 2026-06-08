/**
 * Mobile navigation - hamburger menu with links + inline search (Phase 1.5).
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, MessageCircle, User, LogOut, LayoutDashboard } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useAuthModal } from '@/components/auth/auth-modal-provider'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { PublicNav } from './public-nav'
import { LanguageSwitcher } from './language-switcher'
import { MiniCart } from './mini-cart'
import { useLocale } from '@/hooks/use-locale'
import { siteConfig } from '@/config/site.config'
import { cn } from '@/lib/utils'
import { getDashboardPath } from '@/lib/auth/dashboard-routing'

interface MobileNavProps {
  hiddenRoutes?: Set<string>
}

export function MobileNav({ hiddenRoutes }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const { t } = useLocale()
  const { data: session, status } = useSession()
  const { openAuthModal } = useAuthModal()
  const isAuthenticated = status === 'authenticated' && !!session?.user

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className="min-h-[44px] min-w-[44px]"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[min(90vw,320px)] overflow-y-auto sm:max-w-[320px]"
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle id="mobile-nav-title" className="sr-only">
            {t('nav.home')}
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 pt-2">

          {/* ── Navigation links ── */}
          <div className="pt-1">
            <PublicNav
              className="flex-col items-stretch gap-4 text-base"
              onLinkClick={() => setOpen(false)}
              hiddenRoutes={hiddenRoutes}
            />
          </div>

          {/* ── Language & Cart ── */}
          <div className="flex items-center justify-between border-t pt-4">
            <LanguageSwitcher />
            <MiniCart />
          </div>

          {/* ── Auth section ── */}
          {isAuthenticated ? (
            <div className="flex flex-col gap-2 border-t pt-4">
              <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="truncate">{session.user.name || session.user.email}</span>
              </div>
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link
                  href={getDashboardPath(
                    session.user.role as string | undefined,
                    session.user.assignedRoles
                  )}
                  onClick={() => setOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t('nav.dashboard')}
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="justify-start gap-2 text-destructive hover:text-destructive"
                onClick={() => {
                  setOpen(false)
                  signOut({ callbackUrl: '/' })
                }}
              >
                <LogOut className="h-4 w-4" />
                {t('nav.signOut')}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setOpen(false)
                  openAuthModal('login')
                }}
              >
                {t('nav.login')}
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setOpen(false)
                  openAuthModal('register')
                }}
              >
                {t('nav.register')}
              </Button>
            </div>
          )}

          {/* ── WhatsApp CTA ── */}
          <a
            href={`https://wa.me/${siteConfig.contact.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#25D366] font-medium text-white transition-opacity hover:opacity-90'
            )}
            onClick={() => setOpen(false)}
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            WhatsApp
          </a>
        </div>
      </SheetContent>
    </Sheet>
  )
}
