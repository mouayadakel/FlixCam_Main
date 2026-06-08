/**
 * Package/kit card for the rich packages list page.
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useLocale } from '@/hooks/use-locale'
import { formatCurrency } from '@/lib/i18n/formatting'
import { Badge } from '@/components/ui/badge'
import { Package, Clock, CheckCircle2, ChevronLeft, ArrowLeft } from 'lucide-react'
import type { UnifiedPackageItem } from '@/app/(public)/packages/page'

export function PackageCard({ pkg, isFeatured }: { pkg: UnifiedPackageItem; isFeatured?: boolean }) {
  const { t, locale } = useLocale()

  const displayName = locale === 'ar' ? pkg.name : pkg.nameEn || pkg.name
  const isKit = pkg.type === 'kit'

  // Construct URL
  const href = isKit ? `/packages/${pkg.slug}` : `/studios/${pkg.studioId}`

  // Pull CMS info
  const cms = pkg.cmsData || {}
  const cardImage =
    cms.cardImageUrl ||
    (isKit
      ? 'https://images.pexels.com/photos/1209843/pexels-photo-1209843.jpeg?auto=compress&cs=tinysrgb&w=800'
      : 'https://images.pexels.com/photos/274805/pexels-photo-274805.jpeg?auto=compress&cs=tinysrgb&w=800')

  const badgeText = pkg.badgeText || cms.badgeText
  const isRecommended = pkg.recommended || cms.recommended

  const badgeColorClass = (() => {
    switch (cms.badgeColor) {
      case 'blue': return 'bg-blue-500 text-white'
      case 'orange': return 'bg-orange-500 text-white'
      case 'red': return 'bg-red-500 text-white'
      case 'purple': return 'bg-purple-500 text-white'
      case 'gold': return 'bg-yellow-500 text-black font-semibold'
      default: return 'bg-green-500 text-white'
    }
  })()

  // Savings math
  const originalPrice = pkg.originalPrice
  const finalPrice = pkg.finalPrice
  const savedAmount = originalPrice && finalPrice && originalPrice > finalPrice ? originalPrice - finalPrice : 0

  return (
    <div className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-primary/5 ${
        isFeatured ? 'ring-2 ring-amber-400 ring-offset-2 dark:ring-amber-500 shadow-amber-100 dark:shadow-none' : ''
    }`}>
      {isFeatured && (
        <div className="absolute top-0 start-0 z-[5] w-full h-1 bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200" />
      )}
      
      {/* ── IMAGE SECTION ── */}
      <Link href={href} className="relative aspect-[4/3] w-full overflow-hidden block shrink-0 bg-muted">
        <Image
          src={cardImage}
          alt={displayName}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-80" />

        {/* Badges Overlay */}
        <div className="absolute start-3 top-3 flex flex-col items-start gap-2">
          {isRecommended && (
            <Badge variant="secondary" className="shadow-sm backdrop-blur-md bg-white/90 text-black border-none font-medium">
              🔥 مُوصى به
            </Badge>
          )}
          {badgeText && (
            <Badge className={`shadow-sm border-none ${badgeColorClass} hover:${badgeColorClass}`}>
              {badgeText}
            </Badge>
          )}
          {cms.socialProofCount && (
            <Badge variant="outline" className="shadow-sm border-none bg-primary/10 text-primary backdrop-blur-md">
              {cms.socialProofCount}+ عميل
            </Badge>
          )}
        </div>

        {/* Bottom Tag */}
        <div className="absolute bottom-3 end-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
          {isKit ? 'باقة معدات' : 'باقة استوديو'}
        </div>
      </Link>

      {/* ── CONTENT SECTION ── */}
      <div className="flex flex-1 flex-col p-5">
        
        {/* Title & Tagline */}
        <div className="mb-4">
          <Link href={href} className="focus:outline-none">
            <h3 className="line-clamp-2 text-xl font-bold tracking-tight transition-colors group-hover:text-primary">
              {displayName}
            </h3>
          </Link>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {cms.tagline || pkg.description || t('packagesPage.taglineDefault')}
          </p>
        </div>

        {/* Key Highlights Array (CMS or default) */}
        <div className="mb-6 space-y-2">
          {cms.highlights && cms.highlights.length > 0 ? (
            cms.highlights.slice(0, 3).map((highlight: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{highlight}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {isKit && pkg.itemCount ? (
                <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
                  <Package className="h-4 w-4" />
                  <span>يتضمن {pkg.itemCount} معدات</span>
                </div>
              ) : null}
              {!isKit && pkg.hours ? (
                <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
                  <Clock className="h-4 w-4" />
                  <span>{pkg.hours} ساعات حجز</span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Pricing & CTA */}
        <div className="mt-auto pt-4 border-t border-border/50 flex items-end justify-between gap-2">
          <div>
            {pkg.discountPercent && pkg.discountPercent > 0 ? (
              <div className="mb-0.5 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrency(originalPrice || 0, locale)}
                </span>
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  وفر {Math.round(savedAmount)} ر.س
                </span>
              </div>
            ) : null}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-foreground">
                {formatCurrency(finalPrice || 0, locale)}
              </span>
              <span className="text-sm text-muted-foreground">/ يوم</span>
            </div>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            {locale === 'ar' ? (
              <ArrowLeft className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5 rotate-180" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
