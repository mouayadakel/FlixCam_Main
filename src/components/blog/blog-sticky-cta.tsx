/**
 * Blog sticky CTA bar - appears when scrolling, with smart CTAs based on post/category.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DEFAULT_CTA = {
  ar: { text: 'استأجر المعدات الآن', url: '/equipment' },
  en: { text: 'Rent Equipment Now', url: '/equipment' },
}

interface BlogStickyCtaProps {
  locale: string
  categorySlug?: string
  primaryCtaTextAr: string | null
  primaryCtaTextEn: string | null
  primaryCtaUrl: string | null
  secondaryCtaTextAr: string | null
  secondaryCtaTextEn: string | null
  secondaryCtaUrl: string | null
  relatedEquipmentIds: string[]
}

export function BlogStickyCta({
  locale,
  categorySlug,
  primaryCtaTextAr,
  primaryCtaTextEn,
  primaryCtaUrl,
  secondaryCtaTextAr,
  secondaryCtaTextEn,
  secondaryCtaUrl,
  relatedEquipmentIds,
}: BlogStickyCtaProps) {
  const [visible, setVisible] = useState(false)
  const [scrolledPast, setScrolledPast] = useState(false)

  const primaryText = locale === 'ar' ? primaryCtaTextAr : primaryCtaTextEn
  const primaryUrl = primaryCtaUrl
  const secondaryText = locale === 'ar' ? secondaryCtaTextAr : secondaryCtaTextEn
  const secondaryUrl = secondaryCtaUrl

  const effectivePrimaryText = primaryText ?? (locale === 'ar' ? DEFAULT_CTA.ar.text : DEFAULT_CTA.en.text)
  const effectivePrimaryUrl = primaryUrl ?? (locale === 'ar' ? DEFAULT_CTA.ar.url : DEFAULT_CTA.en.url)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowH = window.innerHeight
      setScrolledPast(scrollY > windowH * 0.5)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!scrolledPast) {
      setVisible(false)
      return
    }
    const t = setTimeout(() => setVisible(true), 150)
    return () => clearTimeout(t)
  }, [scrolledPast])

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 start-0 end-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-transform duration-300"
      role="banner"
      aria-label={locale === 'ar' ? 'إجراء سريع' : 'Quick action'}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-brand-primary" />
          <span className="text-sm font-medium text-gray-700">
            {locale === 'ar' ? 'استأجر المعدات المذكورة في المقال' : 'Rent equipment from this article'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {relatedEquipmentIds.length > 0 && (
            <Button asChild size="sm" variant="outline" className="rounded-lg">
              <Link href="/equipment">
                {locale === 'ar' ? `عرض المعدات (${relatedEquipmentIds.length})` : `View equipment (${relatedEquipmentIds.length})`}
              </Link>
            </Button>
          )}
          <Button asChild size="sm" className="rounded-lg bg-brand-primary hover:bg-brand-primary/90">
            <Link href={effectivePrimaryUrl}>
              {effectivePrimaryText}
            </Link>
          </Button>
          {secondaryText && secondaryUrl && (
            <Button asChild size="sm" variant="ghost" className="rounded-lg">
              <Link href={secondaryUrl}>{secondaryText}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
