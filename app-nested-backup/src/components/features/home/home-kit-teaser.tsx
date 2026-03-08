/**
 * Homepage Build Your Kit teaser – compact horizontal banner linking to kit builder.
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'
import { Package, ArrowRight } from 'lucide-react'

export function HomeKitTeaser() {
  const { t } = useLocale()

  return (
    <section className="border-t border-border-light/50 bg-brand-primary/5 py-8 md:py-10">
      <PublicContainer>
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-brand-primary/10 bg-white px-6 py-8 shadow-card sm:flex-row sm:justify-between md:px-8">
          <div className="flex items-center gap-4 text-center sm:text-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-heading md:text-xl">
                {t('home.kitTeaserTitle')}
              </h2>
              <p className="mt-1 text-sm text-text-body">{t('home.kitTeaserSubtitle')}</p>
            </div>
          </div>
          <Button
            size="lg"
            className="shrink-0 rounded-xl bg-brand-primary px-6 font-semibold shadow-md transition-all hover:bg-brand-primary-hover hover:shadow-lg"
            asChild
          >
            <Link href="/build-your-kit">
              {t('home.kitTeaserButton')}
              <ArrowRight className="ms-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </PublicContainer>
    </section>
  )
}
