const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://flixcam.rent'
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'FlixCam'
const LOGO = process.env.NEXT_PUBLIC_BUSINESS_LOGO || `${SITE_URL.replace(/\/$/, '')}/logo.png`
const PHONE = process.env.NEXT_PUBLIC_BUSINESS_PHONE || ''
const EMAIL = process.env.NEXT_PUBLIC_BUSINESS_EMAIL || ''

function latLng(): { lat: number; lng: number } {
  const lat = parseFloat(process.env.NEXT_PUBLIC_BUSINESS_LAT || '24.7586131')
  const lng = parseFloat(process.env.NEXT_PUBLIC_BUSINESS_LNG || '46.716979')
  return { lat: Number.isFinite(lat) ? lat : 24.7586131, lng: Number.isFinite(lng) ? lng : 46.716979 }
}

export function buildOrganizationSchema(sameAs: string[] = []): object {
  const filtered = sameAs.filter(Boolean)
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL.replace(/\/$/, ''),
    logo: { '@type': 'ImageObject', url: LOGO },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: PHONE,
      contactType: 'customer service',
      availableLanguage: ['Arabic', 'English'],
    },
    ...(filtered.length ? { sameAs: filtered } : {}),
  }
}

export function buildWebSiteSchema(): object {
  const base = SITE_URL.replace(/\/$/, '')
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: base,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${base}/blog?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildLocalBusinessSchema(): object {
  const { lat, lng } = latLng()
  const street = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS_STREET || ''
  const city = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS_CITY || 'Riyadh'
  const country = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS_COUNTRY || 'SA'
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: SITE_NAME,
    image: LOGO,
    url: SITE_URL.replace(/\/$/, ''),
    telephone: PHONE,
    email: EMAIL || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: street,
      addressLocality: city,
      addressCountry: country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Sunday'],
        opens: '09:00',
        closes: '22:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Friday', 'Saturday'],
        opens: '14:00',
        closes: '00:00',
      },
    ],
  }
}

export function buildProductSchema(equipment: {
  id: string
  name: string
  description: string
  price: number
  currency?: string
  imageUrl?: string
  slug: string
  available?: boolean
  brand?: string
  rating?: number
  reviewCount?: number
  category?: string
}): object {
  const base = SITE_URL.replace(/\/$/, '')
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: equipment.name,
    description: equipment.description,
    image: equipment.imageUrl,
    brand: { '@type': 'Brand', name: equipment.brand || SITE_NAME },
    sku: equipment.id,
    offers: {
      '@type': 'Offer',
      url: `${base}/equipment/${equipment.slug}`,
      priceCurrency: equipment.currency || 'SAR',
      price: equipment.price,
      priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: equipment.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
    ...(equipment.rating != null && equipment.reviewCount != null && equipment.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: equipment.rating,
            reviewCount: equipment.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(equipment.category ? { category: equipment.category } : {}),
  }
}

export function buildBreadcrumbListSchema(items: { name: string; url: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function buildServiceSchema(studio: {
  name: string
  description: string
  imageUrl?: string
  slug: string
  price?: number
  currency?: string
}): object {
  const base = SITE_URL.replace(/\/$/, '')
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: studio.name,
    description: studio.description,
    image: studio.imageUrl,
    url: `${base}/studios/${studio.slug}`,
    provider: { '@type': 'Organization', name: SITE_NAME, url: base },
    ...(studio.price != null
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: studio.currency || 'SAR',
            price: studio.price,
          },
        }
      : {}),
  }
}

export function buildFAQPageSchema(faqs: { question: string; answer: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}
