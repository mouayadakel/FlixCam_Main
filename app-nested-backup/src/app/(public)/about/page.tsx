/**
 * About page – company story, value props, stats, location.
 * Trust-building for customers and investors.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/db/prisma'
import { siteConfig } from '@/config/site.config'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'
import { Camera, Zap, Shield, HeadphonesIcon, MapPin, Phone, Mail } from 'lucide-react'
import { t } from '@/lib/i18n/translate'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

export const metadata: Metadata = {
  title: t('ar', 'seo.aboutTitle'),
  description: t('ar', 'seo.aboutDescription'),
  alternates: generateAlternatesMetadata('/about'),
  keywords: ['من نحن', 'FlixCam', 'تأجير معدات', 'الرياض', 'استوديوهات'],
}

async function getAboutStats() {
  try {
    const [equipmentCount, rentalsCount] = await Promise.all([
      prisma.equipment.count({ where: { deletedAt: null, isActive: true } }),
      prisma.booking.count({ where: { deletedAt: null } }).catch(() => 0),
    ])
    return { equipmentCount, rentalsCount, yearFounded: 2020 }
  } catch {
    return { equipmentCount: 0, rentalsCount: 0, yearFounded: 2020 }
  }
}

async function getPrimaryBranch() {
  try {
    const branch = await prisma.branch.findFirst({
      where: { isActive: true },
      select: {
        name: true,
        nameAr: true,
        address: true,
        city: true,
        phone: true,
        email: true,
        workingHours: true,
      },
    })
    return branch
  } catch {
    return null
  }
}

async function getAboutConfig() {
  try {
    const rows = await prisma.integrationConfig.findMany({
      where: {
        key: {
          in: [
            'about_hero_image',
            'about_story_title',
            'about_story_body',
            'about_team_description',
          ],
        },
        deletedAt: null,
      },
      select: { key: true, value: true },
    })
    const map: Record<string, string> = {}
    for (const r of rows) map[r.key] = r.value
    return map
  } catch {
    return {} as Record<string, string>
  }
}

export default async function AboutPage() {
  const [stats, branch, aboutCfg] = await Promise.all([
    getAboutStats(),
    getPrimaryBranch(),
    getAboutConfig(),
  ])
  const address = branch?.address || branch?.city || t('ar', 'about.defaultAddress')
  const workingHours =
    branch?.workingHours && typeof branch.workingHours === 'object'
      ? (branch.workingHours as Record<string, string>)
      : null
  const hoursText = workingHours?.ar || workingHours?.en || t('ar', 'about.defaultHours')

  return (
    <main className="min-h-screen" id="main-content">
      {/* Section 1 — Hero */}
      <section className="relative overflow-hidden bg-hero-gradient py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />
        <PublicContainer className="relative">
          <h1 className="text-center text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            {t('ar', 'about.heroTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-white/85">
            {t('ar', 'about.heroSubtitle')}
          </p>
        </PublicContainer>
      </section>

      {/* Section 2 — Our Story */}
      <section className="border-t border-border-light/50 bg-white py-12 md:py-16">
        <PublicContainer>
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-text-heading md:text-3xl">
                {t('ar', 'about.ourStory')}
              </h2>
              <div className="mt-6 space-y-4 text-body-main text-text-body">
                {aboutCfg.about_story_body ? (
                  aboutCfg.about_story_body
                    .split('\n')
                    .filter(Boolean)
                    .map((p, i) => <p key={i}>{p}</p>)
                ) : (
                  <>
                    <p>{t('ar', 'about.storyP1')}</p>
                    <p>{t('ar', 'about.storyP2')}</p>
                    <p>{t('ar', 'about.storyP3')}</p>
                  </>
                )}
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-light">
              {aboutCfg.about_hero_image ? (
                <Image
                  src={aboutCfg.about_hero_image}
                  alt="FlixCam"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Camera className="h-24 w-24 text-muted-foreground/30" aria-hidden />
                </div>
              )}
            </div>
          </div>
        </PublicContainer>
      </section>

      {/* Section 3 — Why FlixCam (4 value props) */}
      <section className="border-t border-border-light/50 bg-surface-light/30 py-12 md:py-16">
        <PublicContainer>
          <h2 className="mb-10 text-center text-2xl font-bold text-text-heading md:text-3xl">
            {t('ar', 'about.whyFlixCam')}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center rounded-2xl border border-border-light/60 bg-white p-6 text-center shadow-card transition-all hover:shadow-card-hover">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <Camera className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-text-heading">{t('ar', 'about.val1Title')}</h3>
              <p className="mt-2 text-sm text-text-muted">{t('ar', 'about.val1Desc')}</p>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-border-light/60 bg-white p-6 text-center shadow-card transition-all hover:shadow-card-hover">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <Zap className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-text-heading">{t('ar', 'about.val2Title')}</h3>
              <p className="mt-2 text-sm text-text-muted">{t('ar', 'about.val2Desc')}</p>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-border-light/60 bg-white p-6 text-center shadow-card transition-all hover:shadow-card-hover">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <Shield className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-text-heading">{t('ar', 'about.val3Title')}</h3>
              <p className="mt-2 text-sm text-text-muted">{t('ar', 'about.val3Desc')}</p>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-border-light/60 bg-white p-6 text-center shadow-card transition-all hover:shadow-card-hover">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <HeadphonesIcon className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-text-heading">{t('ar', 'about.val4Title')}</h3>
              <p className="mt-2 text-sm text-text-muted">{t('ar', 'about.val4Desc')}</p>
            </div>
          </div>
        </PublicContainer>
      </section>

      {/* Section 4 — Stats Bar */}
      <section className="border-t border-border-light/50 bg-white py-12 md:py-16">
        <PublicContainer>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            <div className="flex flex-col items-center rounded-2xl border border-border-light/60 bg-surface-light/50 p-8 text-center">
              <p className="text-4xl font-extrabold text-brand-primary md:text-5xl">
                {stats.equipmentCount}+
              </p>
              <p className="mt-2 text-sm text-text-muted">{t('ar', 'about.statsEquipment')}</p>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-border-light/60 bg-surface-light/50 p-8 text-center">
              <p className="text-4xl font-extrabold text-brand-primary md:text-5xl">
                {stats.rentalsCount}+
              </p>
              <p className="mt-2 text-sm text-text-muted">{t('ar', 'about.statsRentals')}</p>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-border-light/60 bg-surface-light/50 p-8 text-center">
              <p className="text-4xl font-extrabold text-brand-primary md:text-5xl">
                {stats.yearFounded}
              </p>
              <p className="mt-2 text-sm text-text-muted">{t('ar', 'about.statsYears')}</p>
            </div>
          </div>
        </PublicContainer>
      </section>

      {/* Section 5 — Location / Contact Info */}
      <section className="border-t border-border-light/50 bg-surface-light/30 py-12 md:py-16">
        <PublicContainer>
          <h2 className="mb-8 text-center text-2xl font-bold text-text-heading">
            {t('ar', 'about.locationTitle')}
          </h2>
          <div className="mx-auto max-w-2xl rounded-2xl border border-border-light/60 bg-white p-8 shadow-card">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
                <div>
                  <p className="font-medium text-text-heading">
                    {branch?.nameAr || branch?.name || 'FlixCam'}
                  </p>
                  <p className="text-sm text-text-muted">{address}</p>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-brand-primary transition-colors hover:underline"
                  >
                    {t('ar', 'about.openInMaps')}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0 text-brand-primary" />
                <a
                  href={`tel:${siteConfig.contact.phone}`}
                  className="text-text-body hover:text-brand-primary"
                >
                  {branch?.phone || siteConfig.contact.phone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-brand-primary" />
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="text-text-body hover:text-brand-primary"
                >
                  {branch?.email || siteConfig.contact.email}
                </a>
              </div>
              <p className="text-sm text-text-muted">⏰ {hoursText}</p>
            </div>
          </div>
        </PublicContainer>
      </section>

      {/* Section 6 — CTA */}
      <section className="border-t border-border-light/50 bg-white py-12 md:py-16">
        <PublicContainer className="text-center">
          <h2 className="text-2xl font-bold text-text-heading">{t('ar', 'about.ctaTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-text-muted">{t('ar', 'about.ctaSubtitle')}</p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/equipment">{t('ar', 'about.ctaButton')}</Link>
          </Button>
        </PublicContainer>
      </section>
    </main>
  )
}
