/**
 * Homepage CTA banner – gradient background with decorative elements and strong call to action.
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { PublicContainer } from '@/components/public/public-container'
import { ArrowRight, Sparkles } from 'lucide-react'

export function HomeCta() {
  const { t } = useLocale()

  return (
    <section className="relative overflow-hidden bg-cta-gradient py-16 md:py-20 lg:py-24">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.08)_0%,_transparent_70%)]" />
      <div className="absolute -top-20 -end-20 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-20 -start-20 h-60 w-60 rounded-full bg-black/10 blur-3xl" />

      <PublicContainer>
        <div className="relative text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="mx-auto max-w-2xl text-3xl font-bold text-white md:text-4xl">
            {t('home.ctaTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-white/70">
            {t('home.heroSubtitle')}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-white text-brand-primary hover:bg-white/90 rounded-xl px-8 font-semibold shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
              asChild
            >
              <Link href="/equipment">
                {t('home.ctaButton')}
                <ArrowRight className="ms-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 hover:text-white rounded-xl px-8 font-semibold backdrop-blur-sm transition-all"
              asChild
            >
              <Link href="/how-it-works">{t('nav.howItWorks')}</Link>
            </Button>
          </div>
        </div>
      </PublicContainer>
    </section>
  )
}
