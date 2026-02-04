/**
 * Mobile navigation - hamburger menu with links (Phase 1.5).
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PublicNav } from './public-nav'
import { LanguageSwitcher } from './language-switcher'
import { MiniCart } from './mini-cart'
import { useLocale } from '@/hooks/use-locale'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const { t } = useLocale()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-[min(90vw,320px)]"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle id="mobile-nav-title" className="sr-only">
            {t('nav.home')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6 pt-4">
          <PublicNav
            className="flex-col items-stretch gap-4 text-base"
            onLinkClick={() => setOpen(false)}
          />
          <div className="flex items-center justify-between border-t pt-4">
            <LanguageSwitcher />
            <MiniCart />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" asChild>
              <Link href="/login" onClick={() => setOpen(false)}>
                {t('nav.login')}
              </Link>
            </Button>
            <Button className="flex-1" asChild>
              <Link href="/register" onClick={() => setOpen(false)}>
                {t('nav.register')}
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
