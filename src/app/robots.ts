/**
 * Robots.txt for SEO (Phase 6.2).
 */

import { MetadataRoute } from 'next'

const BASE = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/', '/portal/', '/login', '/register'] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
