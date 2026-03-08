/**
 * @file feature-flag-groups.ts
 * @description Feature flag groups and labels for admin settings/features page.
 * Groups: Public Website | Control Panel | Build Your Kit | Integrations | System
 * @module config
 */

export type FeatureFlagGroup =
  | 'public_website'
  | 'control_panel'
  | 'kit_builder'
  | 'integrations'
  | 'system'
  | 'other'

export interface FeatureFlagMeta {
  name: string
  label: string
  labelAr: string
  description: string
  group: FeatureFlagGroup
  sortOrder: number
}

/** Order of groups on the features page */
export const FEATURE_FLAG_GROUP_ORDER: FeatureFlagGroup[] = [
  'public_website',
  'control_panel',
  'kit_builder',
  'integrations',
  'system',
  'other',
]

export const FEATURE_FLAG_GROUP_LABELS: Record<FeatureFlagGroup, { en: string; ar: string }> = {
  public_website: { en: 'Public Website', ar: 'الموقع العام' },
  control_panel: { en: 'Control Panel (Admin Sidebar)', ar: 'لوحة التحكم' },
  kit_builder: { en: 'Build Your Kit', ar: 'بناء الحزمة' },
  integrations: { en: 'Integrations & Payments', ar: 'التكاملات والمدفوعات' },
  system: { en: 'System', ar: 'النظام' },
  other: { en: 'Other', ar: 'أخرى' },
}

/**
 * Maps flag names to metadata for display.
 * Flags not in this map fall back to scope-based grouping in 'other'.
 */
export const FEATURE_FLAG_META: Record<string, Omit<FeatureFlagMeta, 'name'>> = {
  // ─── Public Website ─────────────────────────────────────────
  enable_equipment_catalog: {
    label: 'Equipment Catalog',
    labelAr: 'كتالوج المعدات',
    description: 'Show /equipment page and nav links',
    group: 'public_website',
    sortOrder: 1,
  },
  enable_studios: {
    label: 'Studios',
    labelAr: 'الاستوديوهات',
    description: 'Show /studios page and nav links',
    group: 'public_website',
    sortOrder: 2,
  },
  enable_packages: {
    label: 'Packages / Kits',
    labelAr: 'الحزم وال kits',
    description: 'Show /packages page and nav links',
    group: 'public_website',
    sortOrder: 3,
  },
  enable_build_kit: {
    label: 'Build Your Kit',
    labelAr: 'ابنِ حزمة معداتك',
    description: 'Show /build-your-kit page and nav links',
    group: 'public_website',
    sortOrder: 4,
  },
  enable_how_it_works: {
    label: 'How It Works',
    labelAr: 'كيف يعمل',
    description: 'Show /how-it-works page and nav links',
    group: 'public_website',
    sortOrder: 5,
  },
  enable_support: {
    label: 'Support',
    labelAr: 'الدعم',
    description: 'Show /support page and nav links',
    group: 'public_website',
    sortOrder: 6,
  },
  enable_whatsapp_cta: {
    label: 'WhatsApp CTA (floating button)',
    labelAr: 'زر واتساب العائم',
    description: 'Show floating WhatsApp button on public site',
    group: 'public_website',
    sortOrder: 7,
  },
  enable_home_kit_teaser: {
    label: 'Homepage Kit Teaser',
    labelAr: 'إعلان كيت الصفحة الرئيسية',
    description: 'Show "Build Your Kit" teaser banner on the homepage',
    group: 'public_website',
    sortOrder: 8,
  },

  // ─── Control Panel (Admin Sidebar) ───────────────────────────
  enable_admin_ai: {
    label: 'AI Features',
    labelAr: 'ميزات الذكاء الاصطناعي',
    description: 'Show AI Features in admin sidebar',
    group: 'control_panel',
    sortOrder: 1,
  },
  enable_admin_kit_builder: {
    label: 'Kit Builder (Admin)',
    labelAr: 'منشئ الحزم',
    description: 'Show Kit Builder in admin sidebar',
    group: 'control_panel',
    sortOrder: 2,
  },
  enable_admin_shoot_types: {
    label: 'Shoot Types',
    labelAr: 'أنواع التصوير',
    description: 'Show Shoot Types in admin sidebar',
    group: 'control_panel',
    sortOrder: 3,
  },
  enable_admin_dynamic_pricing: {
    label: 'Dynamic Pricing',
    labelAr: 'التسعير الديناميكي',
    description: 'Show Dynamic Pricing in admin sidebar',
    group: 'control_panel',
    sortOrder: 4,
  },
  enable_admin_ai_recommendations: {
    label: 'AI Recommendations',
    labelAr: 'التوصيات الذكية',
    description: 'Show AI Recommendations in admin sidebar',
    group: 'control_panel',
    sortOrder: 5,
  },
  enable_admin_vendors: {
    label: 'Vendors',
    labelAr: 'الموردون',
    description: 'Show Vendors section in admin sidebar',
    group: 'control_panel',
    sortOrder: 6,
  },
  enable_admin_marketing: {
    label: 'Marketing',
    labelAr: 'التسويق',
    description: 'Show Marketing in admin sidebar',
    group: 'control_panel',
    sortOrder: 7,
  },
  enable_admin_coupons: {
    label: 'Coupons & Discounts',
    labelAr: 'الكوبونات والخصومات',
    description: 'Show Coupons in admin sidebar',
    group: 'control_panel',
    sortOrder: 8,
  },
  enable_admin_live_ops: {
    label: 'Live Operations',
    labelAr: 'العمليات الحية',
    description: 'Show Live Operations in admin sidebar',
    group: 'control_panel',
    sortOrder: 9,
  },
  enable_admin_analytics: {
    label: 'Analytics & Utilization',
    labelAr: 'التحليلات والإشغال',
    description: 'Show Analytics in admin sidebar',
    group: 'control_panel',
    sortOrder: 10,
  },

  // ─── Build Your Kit (sub-features) ──────────────────────────
  'smart-kit-builder': {
    label: 'Smart Kit Builder Flow',
    labelAr: 'تدفق Smart Kit Builder',
    description: 'Shoot type, budget tier, dynamic category flow',
    group: 'kit_builder',
    sortOrder: 1,
  },
  'kit-ai-assistant': {
    label: 'AI Chat Widget',
    labelAr: 'ودجت الدردشة بالذكاء الاصطناعي',
    description: 'Floating AI chat on Build Your Kit',
    group: 'kit_builder',
    sortOrder: 2,
  },
  'kit-prebuilt-comparison': {
    label: 'Pre-built Kit Comparison',
    labelAr: 'مقارنة الحزم الجاهزة',
    description: 'Pre-built kit comparison at summary step',
    group: 'kit_builder',
    sortOrder: 3,
  },

  // ─── Integrations ───────────────────────────────────────────
  enable_booking_checkout: {
    label: 'Booking Checkout',
    labelAr: 'إتمام الحجز',
    description: 'Enable booking checkout flow',
    group: 'integrations',
    sortOrder: 1,
  },
  enable_payments: {
    label: 'Payment Processing',
    labelAr: 'معالجة المدفوعات',
    description: 'Enable payment processing',
    group: 'integrations',
    sortOrder: 2,
  },
  enable_whatsapp: {
    label: 'WhatsApp Notifications',
    labelAr: 'إشعارات واتساب',
    description: 'Enable WhatsApp notifications',
    group: 'integrations',
    sortOrder: 3,
  },

  // ─── System ─────────────────────────────────────────────────
  enable_ai_recommendations: {
    label: 'AI Equipment Recommendations',
    labelAr: 'توصيات المعدات بالذكاء الاصطناعي',
    description: 'Enable AI equipment recommendations (requires approval)',
    group: 'system',
    sortOrder: 1,
  },
  maintenance_mode: {
    label: 'Maintenance Mode',
    labelAr: 'وضع الصيانة',
    description: 'Read-only access for whole system (requires approval)',
    group: 'system',
    sortOrder: 2,
  },
}

/** Admin sidebar href -> feature flag mapping. Disabled flag hides the item. */
export const ADMIN_SIDEBAR_FLAG_MAP: Record<string, string> = {
  '/admin/ai-dashboard': 'enable_admin_ai',
  '/admin/kit-builder': 'enable_admin_kit_builder',
  '/admin/shoot-types': 'enable_admin_shoot_types',
  '/admin/dynamic-pricing': 'enable_admin_dynamic_pricing',
  '/admin/ai-recommendations': 'enable_admin_ai',
  '/admin/vendors': 'enable_admin_vendors',
  '/admin/marketing': 'enable_admin_marketing',
  '/admin/coupons': 'enable_admin_coupons',
  '/admin/live-ops': 'enable_admin_live_ops',
  '/admin/finance/reports': 'enable_admin_analytics',
  '/admin/analytics': 'enable_admin_analytics',
}
