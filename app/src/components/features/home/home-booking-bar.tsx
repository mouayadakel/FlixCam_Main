/**
 * Homepage Quick Booking Bar – date range, branch selector, delivery toggle, search.
 * Navigates to /equipment with query params.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/hooks/use-locale'
import { PublicContainer } from '@/components/public/public-container'
import { Button } from '@/components/ui/button'
import { Search, MapPin, CalendarDays, Truck } from 'lucide-react'

interface BranchItem {
  id: string
  name: string
  nameAr: string | null
  city: string | null
}

export function HomeBookingBar() {
  const router = useRouter()
  const { t, locale } = useLocale()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [branchId, setBranchId] = useState('')
  const [delivery, setDelivery] = useState(false)
  const [branches, setBranches] = useState<BranchItem[]>([])

  useEffect(() => {
    fetch('/api/public/branches')
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json?.data)) setBranches(json.data)
      })
      .catch(() => {})
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (branchId) params.set('branchId', branchId)
    if (delivery) params.set('delivery', 'true')
    const qs = params.toString()
    router.push(`/equipment${qs ? `?${qs}` : ''}`)
  }

  const getBranchLabel = (b: BranchItem) => {
    const name = locale === 'ar' && b.nameAr ? b.nameAr : b.name
    return b.city ? `${name} — ${b.city}` : name
  }

  return (
    <section className="border-b border-border-light/50 bg-white py-4 shadow-sm md:py-5">
      <PublicContainer>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 md:flex-row md:items-end md:gap-3"
        >
          {/* From date */}
          <div className="flex-1">
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              {t('checkout.startDate')}
            </label>
            <input
              type="date"
              aria-label={t('checkout.startDate')}
              value={from}
              min={today}
              onChange={(e) => {
                setFrom(e.target.value)
                if (to && e.target.value > to) setTo('')
              }}
              className="h-10 w-full rounded-xl border border-border-light bg-surface-light/50 px-3 text-sm text-text-heading outline-none transition-colors focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10"
            />
          </div>

          {/* To date */}
          <div className="flex-1">
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              {t('checkout.endDate')}
            </label>
            <input
              type="date"
              aria-label={t('checkout.endDate')}
              value={to}
              min={from || today}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 w-full rounded-xl border border-border-light bg-surface-light/50 px-3 text-sm text-text-heading outline-none transition-colors focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10"
            />
          </div>

          {/* Branch */}
          {branches.length > 0 && (
            <div className="flex-1">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                <MapPin className="h-3.5 w-3.5" />
                {t('home.bookingBarBranch')}
              </label>
              <select
                value={branchId}
                aria-label={t('home.bookingBarBranch')}
                onChange={(e) => setBranchId(e.target.value)}
                className="h-10 w-full rounded-xl border border-border-light bg-surface-light/50 px-3 text-sm text-text-heading outline-none transition-colors focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/10"
              >
                <option value="">{t('home.bookingBarAllLocations')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {getBranchLabel(b)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Delivery toggle */}
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border-light bg-surface-light/50 px-4 py-2.5 text-sm font-medium text-text-heading transition-colors hover:border-brand-primary/30">
              <Truck className="h-4 w-4 text-text-muted" />
              <span>{t('checkout.deliveryDelivery')}</span>
              <input
                type="checkbox"
                checked={delivery}
                onChange={(e) => setDelivery(e.target.checked)}
                className="h-4 w-4 rounded border-border-light text-brand-primary accent-brand-primary focus:ring-brand-primary/20"
              />
            </label>
          </div>

          {/* Search button */}
          <Button
            type="submit"
            size="lg"
            className="shrink-0 rounded-xl bg-brand-primary px-6 font-semibold shadow-md transition-all hover:bg-brand-primary-hover hover:shadow-lg md:px-8"
          >
            <Search className="me-2 h-4 w-4" />
            {t('common.search')}
          </Button>
        </form>
      </PublicContainer>
    </section>
  )
}
