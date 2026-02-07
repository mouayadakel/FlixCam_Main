/**
 * Public website footer – 4-column hybrid (Contact, Brand, Category, About)
 * with dark visual style per landing-page-design.json footer_hybrid.
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from './public-container'

const CATEGORY_LINKS = [
  { href: '/equipment', key: 'nav.equipment' },
  { href: '/studios', key: 'nav.studios' },
  { href: '/packages', key: 'nav.packages' },
  { href: '/build-your-kit', key: 'nav.buildKit' },
] as const

const ABOUT_LINKS = [
  { href: '/how-it-works', key: 'nav.howItWorks' },
  { href: '/support', key: 'nav.support' },
  { href: '/policies', key: 'nav.policies' },
] as const

export function PublicFooter() {
  const { t } = useLocale()

  return (
    <footer className="border-t border-white/10 bg-footer-dark text-inverse-heading">
      <PublicContainer>
        <div className="grid grid-cols-1 gap-8 py-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Col 1: Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-inverse-heading">
              {t('footer.contactUs')}
            </h3>
            <p className="mt-3 text-body-main text-inverse-body">
              {t('footer.gotQuestion')}
            </p>
            <p className="mt-2">
              <a
                href={`tel:${t('footer.phoneNumber').replace(/\s/g, '')}`}
                className="text-inverse-heading hover:underline"
              >
                {t('footer.phoneNumber')}
              </a>
            </p>
            <p className="mt-1">
              <a
                href={`mailto:${t('footer.emailAddress')}`}
                className="text-inverse-body hover:text-inverse-heading hover:underline"
              >
                {t('footer.emailAddress')}
              </a>
            </p>
            <p className="mt-3 text-label-small uppercase text-inverse-body">
              {t('footer.followUs')}
            </p>
            <div className="mt-2 flex gap-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-inverse-body hover:text-inverse-heading"
                aria-label="Instagram"
              >
                <span className="text-xs font-bold">IG</span>
              </a>
              <a
                href="https://wa.me/966500000000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-inverse-body hover:text-inverse-heading"
                aria-label="WhatsApp"
              >
                <span className="text-xs font-bold">WA</span>
              </a>
            </div>
          </div>

          {/* Col 2: Brand */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-inverse-heading">
              {t('footer.brand')}
            </h3>
            <Link
              href="/"
              className="mt-3 inline-block text-lg font-semibold text-inverse-heading hover:underline"
            >
              FlixCam.rent
            </Link>
            <p className="mt-2 text-body-main text-inverse-body">
              {t('home.heroSubtitle')}
            </p>
          </div>

          {/* Col 3: Category */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-inverse-heading">
              {t('footer.category')}
            </h3>
            <ul className="mt-3 space-y-2">
              {CATEGORY_LINKS.map(({ href, key }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-inverse-body hover:text-inverse-heading hover:underline"
                  >
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: About */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-inverse-heading">
              {t('footer.about')}
            </h3>
            <p className="mt-3 text-body-main text-inverse-body">
              {t('footer.aboutText')}
            </p>
            <ul className="mt-3 space-y-2">
              {ABOUT_LINKS.map(({ href, key }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-inverse-body hover:text-inverse-heading hover:underline"
                  >
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PublicContainer>

      {/* Bottom bar */}
      <div className="border-t border-white/10 bg-footer-darker">
        <PublicContainer>
          <div className="flex min-h-12 flex-col items-center justify-between gap-4 py-4 sm:flex-row">
            <p className="text-label-small uppercase text-inverse-body">
              © {new Date().getFullYear()} FlixCam.rent — {t('footer.copyright')}
            </p>
            <p className="text-label-small text-inverse-body">
              {t('footer.paymentMethods')}
            </p>
            <div className="flex items-center gap-3">
              <span className="h-6 w-10 rounded border border-white/10 bg-white/5" title="Payment" />
              <span className="h-6 w-10 rounded border border-white/10 bg-white/5" title="Payment" />
              <span className="h-6 w-10 rounded border border-white/10 bg-white/5" title="Payment" />
            </div>
          </div>
        </PublicContainer>
      </div>
    </footer>
  )
}
