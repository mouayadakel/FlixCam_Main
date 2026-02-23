/**
 * Studio detail: composes header, gallery, location, booking panel, included, rules, trust, FAQ
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StudioHeader } from './studio-header'
import { StudioGallery } from './studio-gallery'
import { StudioPackageCards } from './studio-package-cards'
import { StudioPackageComparison } from './studio-package-comparison'
import { StudioLocation } from './studio-location'
import { StudioBookingPanel } from './studio-booking-panel'
import { StudioWhatsIncluded } from './studio-whats-included'
import { StudioRules } from './studio-rules'
import { StudioTestimonials } from './studio-testimonials'
import { StudioAvailabilityCalendar } from './studio-availability-calendar'
import { StudioTrust } from './studio-trust'
import { StudioFaq } from './studio-faq'
import { useLocale } from '@/hooks/use-locale'
import { CalendarDays, Users } from 'lucide-react'
import type { StudioPublicData } from '@/lib/types/studio.types'
import { trackStudioEvent } from '@/lib/analytics'

interface StudioDetailProps {
  studio: StudioPublicData
}

export function StudioDetail({ studio }: StudioDetailProps) {
  const { t } = useLocale()
  const hasPackages = studio.packages.length > 0
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    hasPackages
      ? (studio.packages.find((p) => p.recommended)?.id ?? studio.packages[0]?.id ?? null)
      : null
  )
  const selectedPkg = hasPackages ? studio.packages.find((p) => p.id === selectedPackageId) : null
  const [calendarDate, setCalendarDate] = useState('')

  const handleCalendarDateSelect = (dateStr: string) => {
    setCalendarDate(dateStr)
    // Scroll to booking panel
    setTimeout(() => {
      const el = document.getElementById('booking-panel')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleSelectPackage = (id: string | null) => {
    setSelectedPackageId(id)
    const pkg = id ? studio.packages.find((p) => p.id === id) : null
    trackStudioEvent('package_selected', {
      studio_slug: studio.slug,
      package_id: id,
      package_name: pkg ? pkg.nameAr || pkg.name : 'hourly',
      package_price: pkg ? pkg.price : studio.hourlyRate,
    })
  }

  return (
    <div className="space-y-8" dir="rtl">
      <StudioHeader studio={studio} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <StudioGallery studio={studio} />

          {studio.description && (
            <section className="rounded-2xl border border-border-light/40 bg-white p-6 shadow-card">
              <h3 className="mb-3 text-lg font-semibold text-text-heading">
                {t('studios.description')}
              </h3>
              <p className="whitespace-pre-wrap leading-relaxed text-text-body">
                {studio.description}
              </p>
            </section>
          )}

          {/* ⭐ Packages Section */}
          {hasPackages && (
            <StudioPackageCards
              packages={studio.packages}
              hourlyRate={studio.hourlyRate}
              minHours={studio.minHours}
              cancellationPolicyShort={studio.cancellationPolicyShort}
              selectedPackageId={selectedPackageId}
              onSelectPackage={handleSelectPackage}
            />
          )}

          {/* Comparison table */}
          {hasPackages && studio.packages.length >= 2 && (
            <StudioPackageComparison
              packages={studio.packages}
              hourlyRate={studio.hourlyRate}
              selectedPackageId={selectedPackageId}
              onSelectPackage={handleSelectPackage}
            />
          )}

          {/* Social proof */}
          {studio.bookingCountDisplay != null && studio.bookingCountDisplay > 0 && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Users className="h-4 w-4" />
              <span>
                {t('studios.bookingCount').replace('{count}', String(studio.bookingCountDisplay))}
              </span>
            </div>
          )}

          <section className="rounded-2xl border border-border-light/40 bg-white p-6 shadow-card">
            <StudioAvailabilityCalendar
              studioSlug={studio.slug}
              selectedDate={calendarDate}
              onSelectDate={handleCalendarDateSelect}
            />
          </section>

          <StudioLocation studio={studio} />
          <StudioWhatsIncluded studio={studio} />
          <StudioRules studio={studio} />
          {studio.testimonials.length > 0 && (
            <StudioTestimonials testimonials={studio.testimonials} />
          )}
          <StudioTrust studio={studio} />
          <StudioFaq studio={studio} />
        </div>
        <div className="lg:col-span-1">
          <StudioBookingPanel
            studio={studio}
            controlledPackageId={hasPackages ? selectedPackageId : undefined}
            onChangePackage={hasPackages ? handleSelectPackage : undefined}
            controlledDate={calendarDate || undefined}
            onDateChange={setCalendarDate}
          />
        </div>
      </div>

      {/* ── Mobile Sticky CTA ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-light/60 bg-white/95 p-3 shadow-card-elevated backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-public-container items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-heading">
              {selectedPkg ? selectedPkg.nameAr || selectedPkg.name : studio.name}
            </p>
            <p className="text-xs text-text-muted">
              {selectedPkg
                ? `${Number(selectedPkg.price).toLocaleString()} ر.س`
                : studio.hourlyRate > 0
                  ? `${Number(studio.hourlyRate).toLocaleString()} ${t('studios.perHour')}`
                  : ''}
            </p>
          </div>
          <Link
            href="#booking-panel"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-primary-600"
          >
            <CalendarDays className="h-4 w-4" />
            {t('studios.chooseTime')}
          </Link>
        </div>
      </div>
    </div>
  )
}
