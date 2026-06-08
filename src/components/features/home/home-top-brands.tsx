/**
 * Homepage Top Brands – modern grid of brands with logo, name, product count.
 * Hover effects and clean card design.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { SimpleIcon } from 'simple-icons'
import {
  siBlackmagicdesign,
  siDji,
  siFujifilm,
  siNikon,
  siPanasonic,
  siRed,
  siSennheiser,
  siSony,
  siZoom,
} from 'simple-icons'
import { useLocale } from '@/hooks/use-locale'
import { isExternalImageUrl } from '@/lib/utils/image.utils'
import { PublicContainer } from '@/components/public/public-container'
import { ArrowRight } from 'lucide-react'

interface BrandItem {
  id: string
  name: string
  slug: string | null
  description: string | null
  logo: string | null
  equipmentCount: number
}

const BRAND_DOMAIN_MAP: Record<string, string> = {
  sony: 'sony.com',
  canon: 'canon.com',
  arri: 'arri.com',
  red: 'red.com',
  blackmagic: 'blackmagicdesign.com',
  dji: 'dji.com',
  tilta: 'tilta.com',
  godox: 'godox.com',
  aputure: 'aputure.com',
  sennheiser: 'sennheiser.com',
  rode: 'rode.com',
  saramonic: 'saramonic.com',
  sigma: 'sigma-global.com',
  dzofilm: 'dzofilm.com',
  nanlux: 'nanlux.com',
  phottix: 'phottix.com',
  zoom: 'zoomcorp.com',
}

const OFFICIAL_SIMPLE_ICONS: Record<string, SimpleIcon> = {
  sony: siSony,
  dji: siDji,
  blackmagic: siBlackmagicdesign,
  blackmagicdesign: siBlackmagicdesign,
  red: siRed,
  panasonic: siPanasonic,
  nikon: siNikon,
  fujifilm: siFujifilm,
  sennheiser: siSennheiser,
  zoom: siZoom,
}

const LOCAL_OFFICIAL_BRAND_LOGOS: Record<string, string> = {
  aputure: '/brand-logos/aputure.svg',
  canon: '/brand-logos/canon.svg',
  innox: '/brand-logos/innox.svg',
  phottix: '/brand-logos/phottix.svg',
  rm: '/brand-logos/rm.svg',
  sigma: '/brand-logos/sigma.svg',
  tiffen: '/brand-logos/tiffen.svg',
  tilta: '/brand-logos/tilta.svg',
}

function normalizeBrandKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function getMappedBrandLogo(brand: BrandItem): string | null {
  const slugKey = normalizeBrandKey(brand.slug ?? '')
  const nameKey = normalizeBrandKey(brand.name)
  const domain = BRAND_DOMAIN_MAP[slugKey] ?? BRAND_DOMAIN_MAP[nameKey]
  return domain ? `https://logo.clearbit.com/${domain}` : null
}

function getOfficialSimpleIcon(brand: BrandItem): SimpleIcon | null {
  const slugKey = normalizeBrandKey(brand.slug ?? '')
  const nameKey = normalizeBrandKey(brand.name)
  return OFFICIAL_SIMPLE_ICONS[slugKey] ?? OFFICIAL_SIMPLE_ICONS[nameKey] ?? null
}

function getLocalOfficialLogo(brand: BrandItem): string | null {
  const slugKey = normalizeBrandKey(brand.slug ?? '')
  const nameKey = normalizeBrandKey(brand.name)
  return LOCAL_OFFICIAL_BRAND_LOGOS[slugKey] ?? LOCAL_OFFICIAL_BRAND_LOGOS[nameKey] ?? null
}

type BrandLogoCandidate =
  | { type: 'url'; value: string }
  | { type: 'simpleIcon'; value: SimpleIcon }

export interface HomeTopBrandsProps {
  maxItems?: number
  showProductCount?: boolean
  hideWithoutLogo?: boolean
  compactMode?: 'compact' | 'comfortable'
}

export function HomeTopBrands({
  maxItems = 12,
  showProductCount = true,
  hideWithoutLogo = true,
  compactMode = 'compact',
}: HomeTopBrandsProps = {}) {
  const { t } = useLocale()
  const [brands, setBrands] = useState<BrandItem[]>([])
  const [loading, setLoading] = useState(true)
  const [failedLogoUrls, setFailedLogoUrls] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    fetch('/api/public/brands')
      .then((res) => res.json())
      .then((json) => {
        setBrands(Array.isArray(json?.data) ? json.data : [])
      })
      .finally(() => setLoading(false))
  }, [])

  const visibleBrands = brands
    .filter((brand) => {
      if (!hideWithoutLogo) return true
      return Boolean(
        brand.logo ||
        getOfficialSimpleIcon(brand) ||
        getLocalOfficialLogo(brand) ||
        getMappedBrandLogo(brand)
      )
    })
    .slice(0, maxItems)
  const isCompact = compactMode === 'compact'

  return (
    <section className="border-t border-border-light/50 bg-white py-10 md:py-14">
      <PublicContainer>
        <div className="mb-10 text-center">
          <h2 className="text-section-title text-text-heading">{t('home.topBrandsTitle')}</h2>
          <p className="mx-auto mt-3 max-w-md text-body-main text-text-body">
            {t('home.topBrandsSubtitle')}
          </p>
        </div>
        {loading ? (
          <div className={isCompact ? 'grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6' : 'grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-5'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center rounded-2xl border border-border-light/60 bg-surface-light p-6"
              >
                <div className="h-12 w-12 animate-pulse rounded-xl bg-border-light" />
                <div className="mt-3 h-4 w-16 animate-pulse rounded-md bg-border-light" />
                <div className="mt-1.5 h-3 w-12 animate-pulse rounded-md bg-border-light" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
            {visibleBrands.map((brand, index) => {
              const officialSimpleIcon = getOfficialSimpleIcon(brand)
              const localOfficialLogo = getLocalOfficialLogo(brand)
              const mappedDomainLogo = getMappedBrandLogo(brand)
              const candidates: BrandLogoCandidate[] = [
                ...(brand.logo ? [{ type: 'url' as const, value: brand.logo }] : []),
                ...(officialSimpleIcon
                  ? [{ type: 'simpleIcon' as const, value: officialSimpleIcon }]
                  : []),
                ...(localOfficialLogo
                  ? [{ type: 'url' as const, value: localOfficialLogo }]
                  : []),
                ...(mappedDomainLogo
                  ? [{ type: 'url' as const, value: mappedDomainLogo }]
                  : []),
                { type: 'url', value: '/images/brand-placeholder.svg' },
              ]
              const activeLogo =
                candidates.find(
                  (candidate) =>
                    candidate.type === 'simpleIcon' ||
                    (candidate.type === 'url' && !failedLogoUrls.has(candidate.value))
                ) ?? { type: 'url', value: '/images/brand-placeholder.svg' as const }

              return (
                <Link
                  key={brand.id}
                  href={`/equipment?brandId=${brand.id}`}
                  className={
                    isCompact
                      ? 'group flex animate-fade-in-up flex-col items-center rounded-2xl border border-border-light/60 bg-white p-6 opacity-0 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary/10 hover:shadow-card-hover'
                      : 'group flex animate-fade-in-up flex-col items-center rounded-2xl border border-border-light/60 bg-white p-8 opacity-0 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-primary/10 hover:shadow-card-hover'
                  }
                  style={{ animationDelay: `${0.05 * index}s` }}
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-light transition-transform duration-300 group-hover:scale-110">
                    {activeLogo.type === 'simpleIcon' ? (
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden
                        role="img"
                        className="h-full w-full p-2"
                      >
                        <path d={activeLogo.value.path} fill={`#${activeLogo.value.hex}`} />
                      </svg>
                    ) : (
                      <Image
                        src={activeLogo.value}
                        alt={`${brand.name} logo`}
                        fill
                        className="object-contain p-1"
                        sizes="56px"
                        unoptimized={isExternalImageUrl(activeLogo.value)}
                        onError={() => {
                          setFailedLogoUrls((prev) => new Set(prev).add(activeLogo.value))
                        }}
                      />
                    )}
                  </div>
                  <p className="mt-3 text-center text-sm font-semibold text-text-heading transition-colors group-hover:text-brand-primary">
                    {brand.name}
                  </p>
                  {showProductCount && (
                    <p className="mt-0.5 text-label-small text-text-muted">
                      {brand.equipmentCount} {t('common.productsCount')}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
        {!loading && visibleBrands.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/equipment?view=brands"
              className="inline-flex items-center gap-1 font-semibold text-brand-primary transition-colors hover:text-brand-primary-hover"
            >
              {t('home.viewAllBrands')}
              <ArrowRight className="ms-1 h-4 w-4" />
            </Link>
          </div>
        )}
      </PublicContainer>
    </section>
  )
}
