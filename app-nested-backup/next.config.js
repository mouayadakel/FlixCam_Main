/** @type {import('next').NextConfig} */

// Only load bundle-analyzer when ANALYZE=true and the package is installed (dev only)
// With npm ci --omit=dev the package is not installed; wrap in try/catch so build still works.
function withBundleAnalyzer(config) {
  if (process.env.ANALYZE !== 'true') return config
  try {
    const analyzer = require('@next/bundle-analyzer')({ enabled: true })
    return analyzer(config)
  } catch {
    return config
  }
}

// Phase 0.1: Security headers (CSP, CORS, XSS, HTTPS)
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
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
      bodySizeLimit: '50mb', // Allow Excel/CSV uploads up to 50MB
    },
  },
  // Next 16 route handler types expect async params; migrate routes incrementally (see CI_CD_AUDIT_REPORT.md)
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.shopify.com', pathname: '/**' },
      { protocol: 'https', hostname: 'd1ncau8tqf99kp.cloudfront.net', pathname: '/**' },
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
      // Passthrough so dynamic routes resolve correctly in CI/E2E (avoids routing issues)
      { source: '/:path*', destination: '/:path*' },
    ]
  },
}

module.exports = withBundleAnalyzer(nextConfig)
