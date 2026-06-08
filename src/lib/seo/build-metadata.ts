import type { Metadata } from 'next'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://flixcam.rent').replace(
  /\/$/,
  ''
)
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'FlixCam'
const DEFAULT_OG =
  process.env.NEXT_PUBLIC_OG_IMAGE_DEFAULT || `${SITE_URL}/og-default.jpg`
const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_SITE || process.env.NEXT_PUBLIC_TWITTER_HANDLE || '@FlixCam'

export interface BuildMetadataOptions {
  title: string
  description: string
  path: string
  image?: string
  imageWidth?: number
  imageHeight?: number
  type?: 'website' | 'article'
  locale?: string
  alternateLocale?: string[]
  noIndex?: boolean
  alternates?: Metadata['alternates']
}

export function buildPublicMetadata(opts: BuildMetadataOptions): Metadata {
  const path = opts.path.startsWith('/') ? opts.path : `/${opts.path}`
  const url = `${SITE_URL}${path}`
  const image = opts.image || DEFAULT_OG
  const meta: Metadata = {
    title: opts.title,
    description: opts.description,
    ...(opts.noIndex ? { robots: { index: false, follow: false } } : {}),
    alternates: opts.alternates ?? { canonical: url },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      siteName: SITE_NAME,
      locale: opts.locale || 'ar_SA',
      alternateLocale: opts.alternateLocale?.length
        ? opts.alternateLocale
        : ['en_US', 'ar_SA'],
      type: opts.type || 'website',
      images: [
        {
          url: image,
          width: opts.imageWidth || 1200,
          height: opts.imageHeight || 630,
          alt: opts.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  }
  return meta
}
