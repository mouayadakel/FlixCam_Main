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
    <section className="relative overflow-hidden bg-cta-gradient py-10 md:py-12">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.08)_0%,_transparent_70%)]" />
      <div className="absolute -end-20 -top-20 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-20 -start-20 h-60 w-60 rounded-full bg-black/10 blur-3xl" />

      <PublicContainer>
        <div className="relative text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-[4px] bg-white/15 backdrop-blur-sm">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h2 className="mx-auto max-w-2xl text-2xl font-bold text-white md:text-3xl">
            {t('home.ctaTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-white/70">{t('home.ctaSubtitle')}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="rounded-[4px] bg-white px-8 font-semibold text-[#1A1A1A] shadow-lg transition-all hover:bg-white/90 hover:shadow-xl active:scale-[0.98]"
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
              className="rounded-[4px] border-white/30 px-8 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white"
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
