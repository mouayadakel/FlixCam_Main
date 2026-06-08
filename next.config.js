/** @type {import('next').NextConfig} */

// Only load bundle-analyzer when ANALYZE=true (dev dependency; not installed in prod deploy)
const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? require('@next/bundle-analyzer')({ enabled: true })
    : (x) => x

// Phase 0.1: Security headers (CSP, CORS, XSS, HTTPS)
// GTM / GA4: https://developers.google.com/tag-platform/security/guides/csp
const CSP_GOOGLE_TAG = [
  'https://www.googletagmanager.com',
  'https://tagmanager.google.com',
  'https://www.google-analytics.com',
  'https://ssl.google-analytics.com',
  'https://analytics.google.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://*.googletagmanager.com',
].join(' ')

/** Optional marketing pixels (GTM may load these; PublicTrackingScripts uses them when gtmId is empty) */
const CSP_MARKETING_PIXEL_SCRIPTS = [
  'https://sc-static.net', // Snapchat Snap Pixel
  'https://connect.facebook.net', // Meta Pixel
  'https://analytics.tiktok.com', // TikTok Pixel
  'https://s.pinimg.com', // Pinterest tag loader
  'https://static.ads-twitter.com', // X / Twitter Pixel
  'https://www.clarity.ms', // Microsoft Clarity
].join(' ')

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${CSP_GOOGLE_TAG} ${CSP_MARKETING_PIXEL_SCRIPTS}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      // GTM loads https://www.googletagmanager.com/ns.html in a hidden iframe (default-src does not allow it)
      `frame-src 'self' https://www.googletagmanager.com`,
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 120,
  turbopack: {
    root: __dirname,
  },
  experimental: {
    cpus: 2,
    serverActions: {
      bodySizeLimit: '60mb', // Allow uploads up to 60MB
    },
  },
  // Next 16 route handler types expect async params; migrate routes incrementally (see CI_CD_AUDIT_REPORT.md)
  typescript: { ignoreBuildErrors: false },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      { protocol: 'https', hostname: 'flixcam.rent' },
      { protocol: 'https', hostname: 'www.flixcam.rent' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'logo.clearbit.com' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  async redirects() {
    return [
      // Bookings & Action Center
      { source: '/admin/bookings/conflicts', destination: '/admin/bookings?tab=conflicts', permanent: false },
      { source: '/admin/holds', destination: '/admin/bookings?tab=holds', permanent: false },
      { source: '/admin/approvals', destination: '/admin/action-center?tab=approvals', permanent: false },
      // Dashboard
      { source: '/admin/dashboard/overview', destination: '/admin/dashboard', permanent: false },
      { source: '/admin/dashboard/revenue', destination: '/admin/dashboard?tab=revenue', permanent: false },
      { source: '/admin/dashboard/recent-bookings', destination: '/admin/dashboard?tab=recent-bookings', permanent: false },
      { source: '/admin/dashboard/activity', destination: '/admin/dashboard?tab=activity', permanent: false },
      { source: '/admin/dashboard/quick-actions', destination: '/admin/dashboard?tab=quick-actions', permanent: false },
      // AI Dashboard
      { source: '/admin/ai-recommendations', destination: '/admin/ai-dashboard?tab=ai-recommendations', permanent: false },
      // Payments
      { source: '/admin/finance/deposits', destination: '/admin/payments?tab=deposits', permanent: false },
      { source: '/admin/finance/refunds', destination: '/admin/payments?tab=refunds', permanent: false },
      // Equipment
      { source: '/admin/inventory/featured', destination: '/admin/inventory/equipment?tab=featured', permanent: false },
      { source: '/admin/inventory/categories', destination: '/admin/inventory/equipment?tab=categories', permanent: false },
      { source: '/admin/inventory/brands', destination: '/admin/inventory/equipment?tab=brands', permanent: false },
      { source: '/admin/inventory/content-review', destination: '/admin/inventory/equipment?tab=content-review', permanent: false },
      // Maintenance
      { source: '/admin/damage-claims', destination: '/admin/maintenance?tab=damage-claims', permanent: false },
      // Warehouse
      { source: '/admin/ops/warehouse/inventory', destination: '/admin/ops/warehouse', permanent: false },
      { source: '/admin/ops/warehouse/check-in', destination: '/admin/ops/warehouse?tab=check-in', permanent: false },
      { source: '/admin/ops/warehouse/check-out', destination: '/admin/ops/warehouse?tab=check-out', permanent: false },
      // Clients
      { source: '/admin/reviews', destination: '/admin/clients?tab=reviews', permanent: false },
      { source: '/admin/settings/customer-segments', destination: '/admin/clients?tab=segments', permanent: false },
      // Vendors
      { source: '/admin/vendors/payouts', destination: '/admin/vendors?tab=payouts', permanent: false },
      // Finance Reports
      { source: '/admin/analytics', destination: '/admin/finance/reports?tab=analytics', permanent: false },
      // CMS
      { source: '/admin/cms/faq', destination: '/admin/cms', permanent: false },
      { source: '/admin/cms/policies', destination: '/admin/cms?tab=policies', permanent: false },
      { source: '/admin/cms/featured', destination: '/admin/cms?tab=featured', permanent: false },
      { source: '/admin/cms/checkout-form', destination: '/admin/cms?tab=checkout-form', permanent: false },
    ]
  },
  async rewrites() {
    return [
      { source: '/blog/feed.xml', destination: '/blog/rss.xml' },
    ]
  },
}

let exportedConfig = withBundleAnalyzer(nextConfig)

if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    const { withSentryConfig } = require('@sentry/nextjs')
    exportedConfig = withSentryConfig(exportedConfig, {
      silent: true,
      hideSourceMaps: true,
    })
  } catch {
    // @sentry/nextjs optional at build time
  }
}

module.exports = exportedConfig
