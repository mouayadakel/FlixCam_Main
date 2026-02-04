/**
 * Homepage CTA banner (Phase 2.1).
 */

'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'

export function HomeCta() {
  const { t } = useLocale()

  return (
    <section className="py-12 md:py-16 border-t bg-primary text-primary-foreground">
      <div className="container px-4 text-center">
        <h2 className="text-2xl font-semibold">{t('home.ctaTitle')}</h2>
        <Button
          size="lg"
          variant="secondary"
          className="mt-4"
          asChild
        >
          <Link href="/equipment">{t('home.ctaButton')}</Link>
        </Button>
      </div>
    </section>
  )
}
