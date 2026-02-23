/**
 * Public website footer – modern dark gradient, 4-column layout with newsletter,
 * social icons, payment methods, and clear visual hierarchy.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from './public-container'
import { siteConfig } from '@/config/site.config'
import { getWhatsAppUrl } from '@/lib/utils/whatsapp-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Phone, ArrowRight, Instagram, MessageCircle, CreditCard } from 'lucide-react'

const CATEGORY_LINKS = [
  { href: '/equipment', key: 'nav.equipment' },
  { href: '/studios', key: 'nav.studios' },
  { href: '/packages', key: 'nav.packages' },
  { href: '/build-your-kit', key: 'nav.buildKit' },
] as const

interface PublicFooterProps {
  hiddenRoutes?: Set<string>
}

const ABOUT_LINKS = [
  { href: '/about', key: 'nav.about' },
  { href: '/contact', key: 'nav.contact' },
  { href: '/how-it-works', key: 'nav.howItWorks' },
  { href: '/support', key: 'nav.support' },
  { href: '/faq', key: 'nav.faq' },
  { href: '/policies', key: 'nav.policies' },
] as const

export function PublicFooter({ hiddenRoutes }: PublicFooterProps = {}) {
  const { t } = useLocale()
  const [email, setEmail] = useState('')
  const visibleCategoryLinks = hiddenRoutes?.size
    ? CATEGORY_LINKS.filter(({ href }) => !hiddenRoutes.has(href))
    : CATEGORY_LINKS
  const visibleAboutLinks = hiddenRoutes?.size
    ? ABOUT_LINKS.filter(({ href }) => !hiddenRoutes.has(href))
    : ABOUT_LINKS

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault()
    setEmail('')
  }

  return (
    <footer className="bg-footer-gradient text-inverse-body">
      {/* Newsletter section */}
      <div className="border-b border-white/10">
        <PublicContainer>
          <div className="flex flex-col items-center gap-6 py-12 md:flex-row md:justify-between md:gap-12">
            <div className="text-center md:text-start">
              <h3 className="text-xl font-bold text-inverse-heading">{t('footer.contactUs')}</h3>
              <p className="mt-1 text-sm text-inverse-body/80">{t('footer.gotQuestion')}</p>
            </div>
            <form onSubmit={handleNewsletter} className="flex w-full max-w-md gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-12 flex-1 rounded-[4px] border-white/10 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-brand-primary/30"
              />
              <Button
                type="submit"
                className="h-12 rounded-[4px] bg-brand-primary px-6 font-semibold shadow-md transition-all hover:bg-brand-primary-hover hover:shadow-lg"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </PublicContainer>
      </div>

      {/* Main footer grid */}
      <PublicContainer>
        <div className="grid grid-cols-1 gap-10 py-14 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Col 1: Simplified logo + tagline (Podcast Studio & Equipment Rental) */}
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="inline-flex flex-col gap-1 transition-opacity hover:opacity-90"
              aria-label={siteConfig.brandName}
            >
              <span
                className="block h-8 w-[120px] shrink-0 bg-[length:200%_100%] bg-[position:100%_0] bg-no-repeat"
                style={{ backgroundImage: `url(${siteConfig.logoInverted})` }}
                aria-hidden
              />
              <span className="sr-only">{siteConfig.brandName}</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-inverse-body/80">
              {t('footer.tagline')}
            </p>
            <div className="mt-6 space-y-3">
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-3 text-sm text-inverse-body transition-colors hover:text-inverse-heading"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <Phone className="h-4 w-4" />
                </div>
                {siteConfig.contact.phone}
              </a>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="flex items-center gap-3 text-sm text-inverse-body transition-colors hover:text-inverse-heading"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <Mail className="h-4 w-4" />
                </div>
                {siteConfig.contact.email}
              </a>
            </div>
          </div>

          {/* Col 2: Category */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-inverse-heading">
              {t('footer.category')}
            </h3>
            <ul className="mt-5 space-y-3">
              {visibleCategoryLinks.map(({ href, key }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-block text-sm text-inverse-body/80 transition-all hover:translate-x-0.5 hover:text-inverse-heading"
                  >
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: About */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-inverse-heading">
              {t('footer.about')}
            </h3>
            <p className="mt-5 text-sm leading-relaxed text-inverse-body/70">
              {t('footer.aboutText')}
            </p>
            <ul className="mt-4 space-y-3">
              {visibleAboutLinks.map(({ href, key }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-block text-sm text-inverse-body/80 transition-all hover:translate-x-0.5 hover:text-inverse-heading"
                  >
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Social + Follow */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-inverse-heading">
              {t('footer.followUs')}
            </h3>
            <div className="mt-5 flex gap-3">
              <a
                href={siteConfig.contact.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-white/5 text-inverse-body transition-all hover:-translate-y-0.5 hover:bg-brand-primary hover:text-white hover:shadow-lg hover:shadow-brand-primary/20"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={getWhatsAppUrl({ number: siteConfig.contact.whatsappNumber })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-white/5 text-inverse-body transition-all hover:-translate-y-0.5 hover:bg-brand-secondary-accent hover:text-white hover:shadow-lg hover:shadow-brand-secondary-accent/20"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>

            {/* Trust signals */}
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-2 text-sm text-inverse-body/60">
                <CreditCard className="h-4 w-4" />
                <span>{t('footer.paymentMethods')}</span>
              </div>
            </div>
          </div>
        </div>
      </PublicContainer>

      {/* Bottom bar */}
      <div className="border-t border-white/5 bg-footer-darker">
        <PublicContainer>
          <div className="flex min-h-14 flex-col items-center justify-between gap-4 py-5 sm:flex-row">
            <p className="text-xs text-inverse-body/50">
              &copy; {new Date().getFullYear()} {siteConfig.brandName} &mdash;{' '}
              {t('footer.copyright')}
            </p>
            <div className="flex items-center gap-4">
              {/* Payment method icons */}
              {['Visa', 'MC', 'Mada'].map((method) => (
                <span
                  key={method}
                  className="flex h-7 w-12 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[10px] font-semibold text-inverse-body/40 transition-all hover:bg-white/10 hover:text-inverse-body/80"
                  title={method}
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        </PublicContainer>
      </div>
    </footer>
  )
}
