/**
 * Support – contact, WhatsApp, FAQ link.
 * Guarded by enable_support feature flag.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { siteConfig } from '@/config/site.config'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'
import { MessageCircle, Phone, Mail, HelpCircle } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/utils/whatsapp-context'
import { t } from '@/lib/i18n/translate'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

export const metadata: Metadata = {
  title: t('ar', 'seo.supportTitle'),
  description: t('ar', 'seo.supportDescription'),
  alternates: generateAlternatesMetadata('/support'),
  keywords: ['دعم العملاء', 'تواصل', 'واتساب', 'استفسار حجز', 'FlixCam support'],
}

export default async function SupportPage() {
  const enabled = await FeatureFlagService.isEnabled('enable_support')
  if (!enabled) redirect('/')

  const whatsappUrl = getWhatsAppUrl({
    number: siteConfig.contact.whatsappNumber,
    message: 'مرحباً، أود الاستفسار عن الخدمات',
  })

  return (
    <main className="min-h-screen" id="main-content">
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />
        <PublicContainer className="relative">
          <h1 className="text-center text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            {t('ar', 'supportPage.heroTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-white/85">
            {t('ar', 'supportPage.heroSubtitle')}
          </p>
        </PublicContainer>
      </section>

      <section className="border-t border-border-light/50 bg-white py-12 md:py-16">
        <PublicContainer className="max-w-3xl">
          {/* Contact cards */}
          <div className="mb-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border-light/60 bg-surface-light/30 p-6 shadow-card">
              <h2 className="mb-2 flex items-center gap-2 font-semibold text-text-heading">
                <Phone className="h-5 w-5 text-brand-primary" />
                {t('ar', 'supportPage.phoneAndWhatsapp')}
              </h2>
              <p className="mb-4 text-sm text-text-muted">{t('ar', 'supportPage.phoneDesc')}</p>
              <Button asChild size="lg" className="w-full">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="ms-2 h-5 w-5" />
                  {t('ar', 'supportPage.contactWhatsapp')}
                </a>
              </Button>
              <p className="mt-3 text-sm text-text-muted">{siteConfig.contact.phone}</p>
            </div>
            <div className="rounded-2xl border border-border-light/60 bg-surface-light/30 p-6 shadow-card">
              <h2 className="mb-2 flex items-center gap-2 font-semibold text-text-heading">
                <Mail className="h-5 w-5 text-brand-primary" />
                {t('ar', 'supportPage.emailTitle')}
              </h2>
              <p className="mb-4 text-sm text-text-muted">{t('ar', 'supportPage.emailDesc')}</p>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="inline-block font-medium text-brand-primary underline transition-colors hover:opacity-90"
              >
                {siteConfig.contact.email}
              </a>
            </div>
          </div>

          {/* FAQ link */}
          <div className="mb-12 rounded-2xl border border-border-light/60 bg-surface-light/30 p-6 shadow-card">
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-text-heading">
              <HelpCircle className="h-5 w-5 text-brand-primary" />
              {t('ar', 'supportPage.faqTitle')}
            </h2>
            <p className="mb-4 text-sm text-text-muted">{t('ar', 'supportPage.faqDesc')}</p>
            <Button asChild variant="outline" size="lg">
              <Link href="/faq">{t('ar', 'supportPage.browseFaq')}</Link>
            </Button>
          </div>

          {/* لم تجد إجابتك؟ */}
          <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-6 text-center">
            <h2 className="mb-2 text-xl font-bold text-text-heading">
              {t('ar', 'supportPage.notFoundTitle')}
            </h2>
            <p className="mb-4 text-sm text-text-muted">{t('ar', 'supportPage.notFoundDesc')}</p>
            <Button asChild size="lg">
              <Link href="/contact">{t('ar', 'supportPage.contactUs')}</Link>
            </Button>
          </div>

          <p className="mt-8 text-center text-sm text-text-muted">
            {t('ar', 'supportPage.seeAlso')}{' '}
            <Link
              href="/policies"
              className="font-medium text-brand-primary underline hover:opacity-90"
            >
              {t('ar', 'supportPage.termsLink')}
            </Link>{' '}
            <Link
              href="/how-it-works"
              className="font-medium text-brand-primary underline hover:opacity-90"
            >
              {t('ar', 'supportPage.howItWorksLink')}
            </Link>
            .
          </p>
        </PublicContainer>
      </section>
    </main>
  )
}
