/**
 * Public website footer – CMS-driven when data exists and enabled; otherwise static fallback.
 */

/* eslint-disable react-hooks/static-components -- Dynamic icons from getFooterIcon are resolved at render; pattern is intentional for CMS-driven footer */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from './public-container'
import { siteConfig } from '@/config/site.config'
import { getWhatsAppUrl } from '@/lib/utils/whatsapp-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getFooterIcon } from '@/lib/footer-icons'
import { PAYMENT_METHODS } from '@/components/public/payment-method-icons'
import { Mail, Phone, ArrowRight, Instagram, MessageCircle, Linkedin, CreditCard } from 'lucide-react'

const CATEGORY_LINKS = [
  { href: '/equipment', key: 'nav.equipment' },
  { href: '/studios', key: 'nav.studios' },
  { href: '/packages', key: 'nav.packages' },
  { href: '/build-your-kit', key: 'nav.buildKit' },
] as const

const ABOUT_LINKS = [
  { href: '/about', key: 'nav.about' },
  { href: '/contact', key: 'nav.contact' },
  { href: '/how-it-works', key: 'nav.howItWorks' },
  { href: '/support', key: 'nav.support' },
  { href: '/faq', key: 'nav.faq' },
  { href: '/policies', key: 'nav.policies' },
] as const

interface PublicFooterProps {
  hiddenRoutes?: Set<string>
}

type FooterApi = {
  id: string
  enabled: boolean
  layout: string
  backgroundColor: string
  textColor: string
  linkColor: string
  linkHoverColor: string
  socialHoverEffect?: string | null
  socialHoverColor?: string | null
  brand: {
    logoLight: string
    logoDark: string
    companyNameAr: string
    companyNameEn: string
    descriptionAr: string
    descriptionEn: string
    showBrand: boolean
  } | null
  contacts: Array<{
    id: string
    type: string
    labelAr: string
    labelEn: string
    value: string
    icon: string | null
    whatsappEnabled: boolean
    mapsLink: string | null
  }>
  socialLinks: Array<{
    id: string
    platform: string
    url: string
    customIcon: string | null
  }>
  columns: Array<{
    id: string
    titleAr: string
    titleEn: string
    showTitle: boolean
    links: Array<{
      id: string
      textAr: string
      textEn: string
      linkType: string
      url: string
      icon: string | null
      openNewTab: boolean
      categoryId: string | null
    }>
  }>
  legal: {
    copyrightAr: string
    copyrightEn: string
    autoYear: boolean
    layout: string
    links: Array<{ textAr: string; textEn: string; url: string }>
  } | null
  newsletter: {
    enabled: boolean
    titleAr: string
    titleEn: string
    descriptionAr: string
    descriptionEn: string
    placeholderAr: string
    placeholderEn: string
    buttonTextAr: string
    buttonTextEn: string
    successMessageAr: string
    successMessageEn: string
  } | null
}

function NewsletterBlock({
  newsletter,
  getText,
}: {
  newsletter: NonNullable<FooterApi['newsletter']>
  getText: (ar: string, en: string) => string
}) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to subscribe')
      setSuccess(true)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-b border-white/10">
      <PublicContainer>
        <div className="flex flex-col items-center gap-6 py-12 md:flex-row md:justify-between md:gap-12">
          <div className="text-center md:text-start">
            <h3 className="text-xl font-bold text-inverse-heading">
              {getText(newsletter.titleAr, newsletter.titleEn)}
            </h3>
            <p className="mt-1 text-sm opacity-80">
              {getText(newsletter.descriptionAr, newsletter.descriptionEn)}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex w-full max-w-md gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={getText(newsletter.placeholderAr, newsletter.placeholderEn)}
              className="h-12 flex-1 rounded-[4px] border-white/10 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-brand-primary/30"
              disabled={submitting || success}
              required
            />
            <Button type="submit" disabled={submitting || success} className="h-12 rounded-[4px] bg-brand-primary px-6 font-semibold">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
        {success && (
          <p className="text-center text-sm text-green-400" role="status">
            {getText(newsletter.successMessageAr, newsletter.successMessageEn)}
          </p>
        )}
        {error && (
          <p className="text-center text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </PublicContainer>
    </div>
  )
}

function StaticFooterFallback({ hiddenRoutes, t }: { hiddenRoutes?: Set<string>; t: (key: string) => string }) {
  const visibleCategoryLinks = hiddenRoutes?.size
    ? CATEGORY_LINKS.filter(({ href }) => !hiddenRoutes.has(href))
    : CATEGORY_LINKS
  const visibleAboutLinks = hiddenRoutes?.size
    ? ABOUT_LINKS.filter(({ href }) => !hiddenRoutes.has(href))
    : ABOUT_LINKS
  const [email, setEmail] = useState('')
  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault()
    setEmail('')
  }

  return (
    <footer id="site-footer" className="bg-footer-gradient text-inverse-body">
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
      <PublicContainer>
        <div className="grid grid-cols-1 gap-10 py-14 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex flex-col gap-1 transition-opacity hover:opacity-90" aria-label={siteConfig.brandName}>
              <span
                className="block h-8 w-[120px] shrink-0 bg-[length:200%_100%] bg-[position:100%_0] bg-no-repeat"
                style={{ backgroundImage: `url(${siteConfig.logoInverted})` }}
                aria-hidden
              />
              <span className="sr-only">{siteConfig.brandName}</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-inverse-body/80">{t('footer.tagline')}</p>
            <div className="mt-6 space-y-3">
              <a href={`tel:${siteConfig.contact.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 text-sm text-inverse-body transition-colors hover:text-inverse-heading">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5"><Phone className="h-4 w-4" /></div>
                {siteConfig.contact.phone}
              </a>
              <a href={`mailto:${siteConfig.contact.email}`} className="flex items-center gap-3 text-sm text-inverse-body transition-colors hover:text-inverse-heading">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5"><Mail className="h-4 w-4" /></div>
                {siteConfig.contact.email}
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-inverse-heading">{t('footer.category')}</h3>
            <ul className="mt-5 space-y-3">
              {visibleCategoryLinks.map(({ href, key }) => (
                <li key={href}>
                  <Link href={href} className="inline-block text-sm text-inverse-body/80 transition-all hover:translate-x-0.5 hover:text-inverse-heading">{t(key)}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-inverse-heading">{t('footer.about')}</h3>
            <p className="mt-5 text-sm leading-relaxed text-inverse-body/70">{t('footer.aboutText')}</p>
            <ul className="mt-4 space-y-3">
              {visibleAboutLinks.map(({ href, key }) => (
                <li key={href}>
                  <Link href={href} className="inline-block text-sm text-inverse-body/80 transition-all hover:translate-x-0.5 hover:text-inverse-heading">{t(key)}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-inverse-heading">{t('footer.followUs')}</h3>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={siteConfig.contact.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-white/5 text-inverse-body transition-all hover:-translate-y-0.5 hover:bg-brand-primary hover:text-white hover:shadow-lg hover:shadow-brand-primary/20" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href={getWhatsAppUrl({ number: siteConfig.contact.whatsappNumber })} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-white/5 text-inverse-body transition-all hover:-translate-y-0.5 hover:bg-brand-secondary-accent hover:text-white hover:shadow-lg hover:shadow-brand-secondary-accent/20" aria-label="WhatsApp">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href={siteConfig.contact.tiktokUrl} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-white/5 text-inverse-body transition-all hover:-translate-y-0.5 hover:bg-black hover:text-white hover:shadow-lg" aria-label="TikTok">
                {(() => {
                  const Icon = getFooterIcon('tiktok')
                  return Icon ? <Icon className="h-5 w-5" /> : null
                })()}
              </a>
              <a href={siteConfig.contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-white/5 text-inverse-body transition-all hover:-translate-y-0.5 hover:bg-[#0A66C2] hover:text-white hover:shadow-lg" aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-2 text-sm text-inverse-body/60">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span>{t('footer.paymentMethods')}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {PAYMENT_METHODS.map(({ id, label, Icon }) => (
                  <span key={id} className="flex h-8 items-center text-inverse-body/70 transition-opacity hover:opacity-100" title={label}>
                    <Icon size={28} className="h-7 w-auto" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PublicContainer>
      <div className="border-t border-white/5 bg-footer-darker">
        <PublicContainer>
          <div className="flex min-h-14 flex-col items-center justify-between gap-4 py-5 sm:flex-row">
            <p className="text-xs text-inverse-body/50">
              &copy; {new Date().getFullYear()} {siteConfig.brandName} &mdash; {t('footer.copyright')}
            </p>
            <div className="flex items-center gap-4">
              {PAYMENT_METHODS.map(({ id, label, Icon }) => (
                <span key={id} className="flex h-8 items-center text-inverse-body/60 transition-opacity hover:text-inverse-body/90" title={label}>
                  <Icon size={28} className="h-7 w-auto" />
                </span>
              ))}
            </div>
          </div>
        </PublicContainer>
      </div>
    </footer>
  )
}

export function PublicFooter({ hiddenRoutes }: PublicFooterProps = {}) {
  const { t, locale } = useLocale()
  const [footerData, setFooterData] = useState<FooterApi | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/footer')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setFooterData(data)
      })
      .catch(() => {
        if (!cancelled) setFooterData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const isRTL = locale === 'ar'
  const getText = (ar: string, en: string) => (isRTL ? ar : en)

  if (loading || !footerData || !footerData.enabled) {
    return <StaticFooterFallback hiddenRoutes={hiddenRoutes} t={t} />
  }

  const style = {
    backgroundColor: footerData.backgroundColor,
    color: footerData.textColor,
    ['--footer-link' as string]: footerData.linkColor,
    ['--footer-link-hover' as string]: footerData.linkHoverColor,
  }

  const linkStyle = { color: footerData.linkColor }
  const filteredColumns = footerData.columns.map((col) => ({
    ...col,
    links: col.links.filter((link) => !hiddenRoutes?.has(link.url)),
  }))

  return (
    <footer id="site-footer" className="text-inverse-body" style={style}>
      {/* Newsletter */}
      {footerData.newsletter?.enabled && (
        <NewsletterBlock
          newsletter={footerData.newsletter}
          getText={getText}
        />
      )}

      {/* Main grid */}
      <PublicContainer>
        <div className="grid grid-cols-1 gap-10 py-14 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Brand + contacts */}
          <div className="lg:col-span-1">
            {footerData.brand?.showBrand && (
              <>
                <Link href="/" className="inline-flex flex-col gap-1 transition-opacity hover:opacity-90" aria-label={getText(footerData.brand.companyNameAr, footerData.brand.companyNameEn)}>
                  {footerData.brand.logoLight && (
                    <span className="relative block h-8 w-[120px] shrink-0">
                      <Image src={footerData.brand.logoLight} alt="" width={120} height={32} className="object-contain object-left" />
                    </span>
                  )}
                  <span className="sr-only">{getText(footerData.brand.companyNameAr, footerData.brand.companyNameEn)}</span>
                </Link>
                <p className="mt-3 text-sm leading-relaxed opacity-80">
                  {getText(footerData.brand.descriptionAr, footerData.brand.descriptionEn)}
                </p>
              </>
            )}
            {footerData.contacts.length > 0 && (
              <div className="mt-6 space-y-3">
                {footerData.contacts.map((contact) => {
                  let href = contact.value
                  if (contact.type === 'phone') {
                    href = contact.whatsappEnabled
                      ? getWhatsAppUrl({ number: contact.value.replace(/\D/g, '') })
                      : `tel:${contact.value.replace(/\s/g, '')}`
                  } else if (contact.type === 'email') {
                    href = `mailto:${contact.value}`
                  } else if (contact.type === 'address' && contact.mapsLink) {
                    href = contact.mapsLink
                  }
                  const Icon = contact.icon ? getFooterIcon(contact.icon) : null
                  return (
                    <a
                      key={contact.id}
                      href={href}
                      target={contact.type === 'address' && contact.mapsLink ? '_blank' : undefined}
                      rel={contact.type === 'address' && contact.mapsLink ? 'noopener noreferrer' : undefined}
                      className="flex items-center gap-3 text-sm transition-colors hover:opacity-90"
                    >
                      {Icon && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                          <Icon className="h-4 w-4" />
                        </div>
                      )}
                      {getText(contact.labelAr, contact.labelEn)}: {contact.value}
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          {/* Columns */}
          {filteredColumns.map((column) => (
            <div key={column.id}>
              {column.showTitle && (
                <h3 className="text-sm font-semibold uppercase tracking-wider text-inverse-heading">
                  {getText(column.titleAr, column.titleEn)}
                </h3>
              )}
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => {
                  let href = link.url
                  if (link.linkType === 'phone') href = `tel:${link.url}`
                  else if (link.linkType === 'email') href = `mailto:${link.url}`
                  else if (link.linkType === 'category' && link.categoryId) href = `/equipment?category=${link.categoryId}`
                  const LinkIcon = link.icon ? getFooterIcon(link.icon) : null
                  const linkContent = (
                    <>
                      {LinkIcon && <LinkIcon className="ms-1 inline-block h-4 w-4" />}
                      {getText(link.textAr, link.textEn)}
                    </>
                  )
                  const className = "inline-block text-sm opacity-80 transition-all hover:opacity-100"
                  if (link.linkType === 'external') {
                    return (
                      <li key={link.id}>
                        <a href={href} target={link.openNewTab ? '_blank' : '_self'} rel={link.openNewTab ? 'noopener noreferrer' : undefined} className={className} style={linkStyle}>
                          {linkContent}
                        </a>
                      </li>
                    )
                  }
                  return (
                    <li key={link.id}>
                      <Link href={href} className={className} style={linkStyle}>
                        {linkContent}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          {/* Social */}
          {footerData.socialLinks.length > 0 && (() => {
            const effect = footerData.socialHoverEffect ?? 'lift'
            const hoverColor = footerData.socialHoverColor ?? ''
            const hasCustomColor = Boolean(hoverColor)
            const wrapperStyle = hasCustomColor ? { ['--footer-social-hover' as string]: hoverColor } : undefined
            const baseClass = 'flex h-10 w-10 items-center justify-center rounded-[4px] bg-white/5 transition-all duration-200'
            const effectClasses: Record<string, string> = {
              lift: 'hover:-translate-y-0.5 hover:bg-brand-primary hover:text-white hover:shadow-lg',
              scale: 'hover:scale-110 hover:text-white ' + (hasCustomColor ? 'footer-social-hover-bg' : 'hover:bg-brand-primary'),
              glow: 'hover:-translate-y-0.5 hover:text-white ' + (hasCustomColor ? 'footer-social-hover-glow' : 'hover:shadow-lg hover:bg-brand-primary'),
              background: 'hover:-translate-y-0.5 hover:text-white ' + (hasCustomColor ? 'footer-social-hover-bg' : 'hover:bg-brand-primary'),
            }
            return (
              <div style={wrapperStyle}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-inverse-heading">
                  {getText('تابعنا', 'Follow Us')}
                </h3>
                <div className="mt-5 flex gap-3">
                  {footerData.socialLinks.map((social) => {
                    const Icon = getFooterIcon(social.platform)
                    return (
                      <a
                        key={social.id}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${baseClass} ${effectClasses[effect] ?? effectClasses.lift}`}
                        aria-label={social.platform}
                      >
                        {social.customIcon ? (
                          <Image src={social.customIcon} alt="" width={20} height={20} />
                        ) : Icon ? (
                          <Icon className="h-5 w-5" />
                        ) : null}
                      </a>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      </PublicContainer>

      {/* Legal */}
      {footerData.legal && (
        <div className="border-t border-white/5 bg-black/20">
          <PublicContainer>
            <div
              className={`flex min-h-14 flex-col items-center justify-between gap-4 py-5 sm:flex-row ${
                footerData.legal.layout === 'center' ? 'text-center' : footerData.legal.layout === 'right' ? 'text-end' : 'text-start'
              }`}
            >
              <p className="text-xs opacity-70">
                {footerData.legal.autoYear
                  ? getText(footerData.legal.copyrightAr, footerData.legal.copyrightEn).replace('{year}', String(new Date().getFullYear()))
                  : getText(footerData.legal.copyrightAr, footerData.legal.copyrightEn)}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                {footerData.legal.links.map((l, i) => (
                  <Link key={i} href={l.url} className="text-xs opacity-70 hover:opacity-100 transition-opacity" style={linkStyle}>
                    {getText(l.textAr, l.textEn)}
                  </Link>
                ))}
                <div className="flex items-center gap-3 opacity-80">
                  {PAYMENT_METHODS.map(({ id, label, Icon }) => (
                    <span key={id} className="flex h-8 items-center" title={label}>
                      <Icon size={28} className="h-7 w-auto" />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </PublicContainer>
        </div>
      )}
    </footer>
  )
}
