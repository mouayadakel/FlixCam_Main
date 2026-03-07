/**
 * Studio detail page: uses StudioService.getBySlugPublic for full CMS data
 */

import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { StudioService } from '@/lib/services/studio.service'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { StudioDetail } from '@/components/features/studio/studio-detail'
import { StudioBreadcrumb } from '@/components/features/studio/studio-breadcrumb'
import type { StudioPublicData } from '@/lib/types/studio.types'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const raw = await StudioService.getBySlugPublic(slug)
  if (!raw) return {}
  const title = (raw.metaTitle as string) || raw.name
  const description = (raw.metaDescription as string) || raw.description || undefined
  const imageUrl = raw.media?.[0]?.url
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${BASE_URL}/studios/${slug}`,
      ...(imageUrl && { images: [{ url: imageUrl, width: 1200, height: 630, alt: title }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  }
}

function toStudioPublicData(
  raw: Awaited<ReturnType<typeof StudioService.getBySlugPublic>>
): StudioPublicData | null {
  if (!raw) return null
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    capacity: raw.capacity,
    hourlyRate: raw.hourlyRate ? Number(raw.hourlyRate) : 0,
    dailyRate: raw.dailyRate ? Number(raw.dailyRate) : null,
    setupBuffer: raw.setupBuffer ?? 30,
    cleaningBuffer: raw.cleaningBuffer ?? 30,
    slotDurationMinutes: raw.slotDurationMinutes ?? 60,
    minHours: raw.minHours ?? 1,
    vatIncluded: raw.vatIncluded ?? false,
    bookingDisclaimer: raw.bookingDisclaimer,
    areaSqm: raw.areaSqm,
    studioType: raw.studioType,
    bestUse: raw.bestUse,
    availabilityConfidence: raw.availabilityConfidence,
    videoUrl: raw.videoUrl,
    galleryDisclaimer: raw.galleryDisclaimer,
    address: raw.address,
    googleMapsUrl: raw.googleMapsUrl,
    arrivalTimeFromCenter: raw.arrivalTimeFromCenter,
    parkingNotes: raw.parkingNotes,
    whatsIncluded: raw.whatsIncluded,
    notIncluded: raw.notIncluded,
    hasElectricity: raw.hasElectricity ?? true,
    hasAC: raw.hasAC ?? true,
    hasChangingRooms: raw.hasChangingRooms ?? false,
    hasWifi: (raw as any).hasWifi ?? true,
    rulesText: raw.rulesText,
    smokingPolicy: raw.smokingPolicy,
    foodPolicy: raw.foodPolicy,
    equipmentCarePolicy: raw.equipmentCarePolicy,
    cancellationPolicyShort: raw.cancellationPolicyShort,
    cancellationPolicyLink: raw.cancellationPolicyLink,
    heroTagline: (raw as any).heroTagline ?? null,
    reviewsText: raw.reviewsText,
    whatsappNumber: raw.whatsappNumber,
    bookingCountDisplay: (raw as any).bookingCountDisplay ?? null,
    discountPercent: raw.discountPercent ?? null,
    discountMessage: raw.discountMessage ?? null,
    discountActive: raw.discountActive ?? false,
    media: (raw.media ?? []).map((m: any) => ({
      id: m.id,
      url: m.url,
      type: m.type,
      sortOrder: m.sortOrder,
    })),
    packages: (raw.packages ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      nameAr: p.nameAr,
      nameZh: (p as any).nameZh ?? null,
      description: p.description,
      descriptionAr: (p as any).descriptionAr ?? null,
      includes: p.includes,
      price: p.price ? Number(p.price) : 0,
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      discountPercent: p.discountPercent,
      hours: p.hours,
      recommended: (p as any).recommended ?? false,
      badgeText: (p as any).badgeText ?? null,
      order: p.order,
    })),
    faqs: (raw.faqs ?? []).map((f) => ({
      id: f.id,
      questionAr: f.questionAr,
      questionEn: f.questionEn,
      questionZh: f.questionZh,
      answerAr: f.answerAr,
      answerEn: f.answerEn,
      answerZh: f.answerZh,
      order: f.order,
    })),
    addOns: (raw.addOns ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      price: a.price ? Number(a.price) : 0,
      originalPrice: a.originalPrice ? Number(a.originalPrice) : null,
      category: a.category ?? null,
      iconName: a.iconName ?? null,
    })),
    testimonials: ((raw as any).testimonials ?? [])
      .filter((t: any) => t.isActive && !t.deletedAt)
      .map((t: any) => ({
        id: t.id,
        name: t.name,
        role: t.role ?? null,
        text: t.text,
        rating: t.rating ?? 5,
        avatarUrl: t.avatarUrl ?? null,
      })),
  }
}

function buildJsonLd(studio: StudioPublicData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: studio.name,
    description: studio.description,
    url: `${BASE_URL}/studios/${studio.slug}`,
    ...(studio.media[0]?.url && { image: studio.media[0].url }),
    ...(studio.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: studio.address,
        addressLocality: 'Riyadh',
        addressCountry: 'SA',
      },
    }),
    priceRange: `${studio.hourlyRate} SAR/hr`,
    ...(studio.faqs.length > 0 && {
      mainEntity: studio.faqs.map((f) => ({
        '@type': 'Question',
        name: f.questionAr,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answerAr,
        },
      })),
    }),
  }
}

export default async function StudioDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const enabled = await FeatureFlagService.isEnabled('enable_studios')
  if (!enabled) redirect('/')
  const { slug } = await params
  const raw = await StudioService.getBySlugPublic(slug)
  const studio = toStudioPublicData(raw)
  if (!studio) notFound()

  const jsonLd = buildJsonLd(studio)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="mx-auto w-full max-w-public-container px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <Suspense fallback={<StudioDetailFallback />}>
          <StudioBreadcrumb studioName={studio.name} />
          <StudioDetail studio={studio} />
        </Suspense>
      </main>
    </>
  )
}

function StudioDetailFallback() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-5 w-32 rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-8 w-64 rounded-xl bg-muted" />
        <div className="h-4 w-48 rounded bg-muted/60" />
        <div className="flex gap-2">
          <div className="h-7 w-20 rounded-full bg-muted/60" />
          <div className="h-7 w-24 rounded-full bg-muted/60" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="aspect-video rounded-2xl bg-muted" />
          <div className="h-20 rounded-xl bg-muted/40" />
        </div>
        <div className="h-80 rounded-xl bg-muted/40" />
      </div>
    </div>
  )
}
