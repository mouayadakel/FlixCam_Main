/**
 * Premium Package detail: items, pricing, marketing info (Phase 2.5).
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/i18n/formatting'
import { 
  Package, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Headset, 
  MessageCircle,
  Share2,
  ChevronDown
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface PackageDetailProps {
  pkg: {
    id: string
    name: string
    nameEn?: string | null
    slug: string
    description: string | null
    descriptionEn?: string | null
    discountPercent: number
    subtotal: number
    total: number
    cmsData: any
    items: {
      equipmentId: string
      quantity: number
      equipment: {
        id: string
        sku: string
        model: string | null
        dailyPrice: number
        media: { url: string; type: string }[]
      }
    }[]
    related?: any[]
  }
}

export function PackageDetail({ pkg }: PackageDetailProps) {
  const { t, locale } = useLocale()
  
  const displayName = locale === 'ar' ? pkg.name : pkg.nameEn || pkg.name
  const displayDesc = locale === 'ar' ? pkg.description : pkg.descriptionEn || pkg.description
  const cms = pkg.cmsData || {}

  useEffect(() => {
    if (cms.gtmEventName && typeof window !== 'undefined' && (window as any).dataLayer) {
      ;(window as any).dataLayer.push({
        event: cms.gtmEventName,
        package_id: pkg.id,
        package_name: pkg.name,
        package_price: pkg.total,
      })
    }
    if (cms.metaPixelEventName && typeof window !== 'undefined' && (window as any).fbq) {
      ;(window as any).fbq('trackCustom', cms.metaPixelEventName, {
        content_name: pkg.name,
        content_category: 'Package',
        value: pkg.total,
        currency: 'SAR',
      })
    }
  }, [cms.gtmEventName, cms.metaPixelEventName, pkg.id, pkg.name, pkg.total])

  const coverImageUrl =
    cms.coverImageUrl ||
    'https://images.pexels.com/photos/1209843/pexels-photo-1209843.jpeg?auto=compress&cs=tinysrgb&w=1920'
  const badgeText = cms.badgeText
  const badgeColor = cms.badgeColor || 'green'
  
  const badgeColorClass = (() => {
    switch (badgeColor) {
      case 'blue': return 'bg-blue-500 text-white'
      case 'orange': return 'bg-orange-500 text-white'
      case 'red': return 'bg-red-500 text-white'
      case 'purple': return 'bg-purple-500 text-white'
      case 'gold': return 'bg-yellow-500 text-black font-semibold'
      default: return 'bg-green-500 text-white'
    }
  })()

  const savedAmount = pkg.subtotal - pkg.total
  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    process.env.NEXT_PUBLIC_BUSINESS_PHONE?.replace(/\D/g, '') ||
    '966508020033'
  const whatsappMsg = `مرحباً، أود الاستفسار عن باقة: ${displayName}`
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: displayName,
    description: displayDesc || '',
    image: coverImageUrl,
    offers: {
      '@type': 'Offer',
      price: pkg.total,
      priceCurrency: 'SAR',
      availability: 'https://schema.org/InStock',
      url: `https://flixcam.rent/packages/${pkg.slug}`,
    },
  }

  return (
    <div className="mx-auto max-w-6xl pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
      {/* ── HERO / COVER SECTION ── */}
      <div className="relative mb-12 h-[400px] w-full overflow-hidden rounded-3xl md:h-[500px]">
        <Image
          src={coverImageUrl}
          alt={displayName}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="absolute bottom-0 start-0 p-6 md:p-12 w-full max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="secondary" className="backdrop-blur-md bg-white/10 text-white border-none">
                <Package className="me-1.5 h-3.5 w-3.5" />
                باقة معدات سينمائية
              </Badge>
              {badgeText && (
                <Badge className={`border-none ${badgeColorClass}`}>
                  {badgeText}
                </Badge>
              )}
              {cms.socialProofCount && (
                <Badge variant="outline" className="backdrop-blur-md bg-primary/20 text-primary border-primary/30">
                  <span className="me-1 font-bold">{cms.socialProofCount}</span>
                  عميل سعيد
                </Badge>
              )}
            </div>
            
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              {cms.heroTitle || displayName}
            </h1>
            
            {cms.heroSubtitle ? (
               <p className="text-lg text-muted-foreground md:text-xl max-w-2xl">
                 {cms.heroSubtitle}
               </p>
            ) : displayDesc ? (
               <p className="text-lg text-muted-foreground md:text-xl max-w-2xl">
                 {displayDesc}
               </p>
            ) : null}
          </motion.div>
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-3">
        {/* ── LEFT COLUMN (DETAILS) ── */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Highlights */}
          {cms.highlights && cms.highlights.length > 0 && (
            <section>
              <h2 className="mb-4 text-2xl font-bold">{t('packagesPage.includes')}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {cms.highlights.map((h: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <span className="font-medium text-foreground">{h}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Detailed Inclusion / Exclusion */}
          {(cms.whatsIncluded?.length > 0 || cms.notIncluded?.length > 0) && (
            <section className="grid gap-6 sm:grid-cols-2">
              {cms.whatsIncluded?.length > 0 && (
                <div className="rounded-2xl border bg-green-50/30 p-6 dark:bg-green-900/10">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    ما الذي ستحصل عليه؟
                  </h3>
                  <ul className="space-y-3">
                    {cms.whatsIncluded.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {cms.notIncluded?.length > 0 && (
                <div className="rounded-2xl border bg-red-50/30 p-6 dark:bg-red-900/10">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-red-700 dark:text-red-400">
                    <ChevronDown className="h-5 w-5 rotate-45" />
                    غير مشمول في الباقة
                  </h3>
                  <ul className="space-y-3">
                    {cms.notIncluded.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Included Equipment List */}
          <section>
            <h2 className="mb-4 text-2xl font-bold">{t('packagesPage.includedEquipment')}</h2>
            <div className="space-y-4">
              {pkg.items.map((item) => (
                <div 
                  key={item.equipmentId} 
                  className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.equipment.media[0]?.url ? (
                      <Image
                        src={item.equipment.media[0].url}
                        alt={item.equipment.model ?? item.equipment.sku}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/equipment/${item.equipmentId}`}
                      className="text-lg font-semibold hover:text-primary transition-colors line-clamp-1"
                    >
                      {item.equipment.model ?? item.equipment.sku}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      الكمية المتضمنة: <span className="font-medium text-foreground">{item.quantity}</span>
                    </p>
                  </div>
                  <div className="hidden text-end sm:block">
                    <p className="font-semibold text-foreground">
                      {formatCurrency(item.equipment.dailyPrice, locale)}
                    </p>
                    <p className="text-xs text-muted-foreground">باليوم للقطعة</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQs */}
          {cms.faqs && cms.faqs.length > 0 && (
            <section>
              <h2 className="mb-4 text-2xl font-bold">{t('packagesPage.faqTitle')}</h2>
              <Accordion type="single" collapsible className="w-full rounded-2xl border px-4 pb-2">
                {cms.faqs.map((faq: {q: string, a: string}, idx: number) => (
                  <AccordionItem key={idx} value={`faq-${idx}`}>
                    <AccordionTrigger className="text-start font-semibold">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

        </div>

        {/* ── RIGHT COLUMN (STICKY CTA) ── */}
        <div className="relative">
          <div className="sticky top-24 space-y-6">
            
            {/* Pricing Card */}
            <div className="rounded-3xl border bg-card p-6 shadow-xl dark:shadow-primary/5">
              <div className="mb-6 space-y-2">
                {pkg.discountPercent > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground line-through">
                      {formatCurrency(pkg.subtotal, locale)}
                    </span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900">
                      توفير {Math.round(savedAmount)} ر.س
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">
                    {formatCurrency(pkg.total, locale)}
                  </span>
                  <span className="text-muted-foreground font-medium">/ يوم</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button className="w-full text-lg h-14 rounded-xl shadow-lg" size="lg" asChild>
                  <Link href={`/cart?kit=${pkg.slug}`}>
                    {t('packagesPage.bookNow')}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full text-lg h-14 rounded-xl border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 dark:bg-green-900/10 dark:text-green-500 dark:border-green-900 dark:hover:bg-green-900/30" asChild>
                  <Link href={whatsappLink} target="_blank">
                    <MessageCircle className="me-2 h-5 w-5" />
                    {cms.whatsappCtaText || t('packagesPage.bookViaWhatsapp')}
                  </Link>
                </Button>
              </div>

              {/* Trust Metrics */}
              <div className="mt-8 space-y-4 pt-6 border-t border-border/50">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span>{t('packagesPage.trustMetrics.verified')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock className="h-5 w-5 text-primary" />
                  <span>{t('packagesPage.trustMetrics.guaranteed')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Headset className="h-5 w-5 text-primary" />
                  <span>{t('packagesPage.trustMetrics.support')}</span>
                </div>
              </div>
            </div>

            {/* Share Card */}
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: displayName,
                  text: displayDesc || '',
                  url: window.location.href,
                }).catch(console.error)
              }
            }}>
              <Share2 className="me-2 h-4 w-4" />
              {t('packagesPage.share')}
            </Button>
          </div>
        </div>

      </div>

      {/* ── RELATED PACKAGES ── */}
      {pkg.related && pkg.related.length > 0 && (
        <section className="mt-24 pt-12 border-t">
          <h2 className="mb-8 text-3xl font-bold text-center">{t('packagesPage.relatedPackages')}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pkg.related.map((relatedPkg) => {
              const rName = locale === 'ar' ? relatedPkg.name : relatedPkg.nameEn || relatedPkg.name;
              const rImage = relatedPkg.cmsData?.cardImageUrl || coverImageUrl;
              const rSaved = relatedPkg.originalPrice - relatedPkg.finalPrice;
              
              return (
                <Link 
                  href={`/packages/${relatedPkg.slug}`} 
                  key={relatedPkg.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    <Image
                      src={rImage}
                      alt={rName}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="line-clamp-2 text-xl font-bold tracking-tight mb-2 group-hover:text-primary">
                      {rName}
                    </h3>
                    <div className="mt-auto pt-4 flex items-end justify-between">
                      <div>
                        {relatedPkg.discountPercent > 0 && (
                           <span className="mb-1 block text-sm text-green-600 font-bold">
                             وفر {Math.round(rSaved)} ر.س
                           </span>
                        )}
                        <span className="text-2xl font-black text-foreground">
                          {formatCurrency(relatedPkg.finalPrice, locale)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
