/**
 * Marketing settings: DB-backed overrides for tracking IDs (falls back to env).
 */

import { prisma } from '@/lib/db/prisma'
import { rootLayoutGtmContainerId } from '@/lib/analytics/gtm-config'

export const MARKETING_SETTING_KEYS = [
  'ga4_id',
  'gtm_id',
  'gsc_verification',
  'google_ads_id',
  'google_ads_label',
  'google_maps_key',
  'meta_pixel_id',
  'meta_capi_token',
  'meta_test_code',
  'tiktok_pixel_id',
  'snapchat_pixel_id',
  'pinterest_tag_id',
  'twitter_pixel_id',
  'twitter_handle',
  'clarity_id',
  'mailchimp_api_key',
  'mailchimp_list_id',
  'mailchimp_server',
  'site_url',
  'site_name',
  'site_name_ar',
  'business_phone',
  'business_email',
  'whatsapp_number',
  'business_address',
  'business_city',
  'business_country',
  'business_lat',
  'business_lng',
  'business_logo',
  'og_default_image',
  'twitter_default_image',
  'instagram_url',
  'facebook_url',
  'twitter_url',
  'tiktok_url',
  'youtube_url',
  'linkedin_url',
  'whatsapp_default_message_ar',
  'whatsapp_default_message_en',
  'whatsapp_equipment_template_ar',
  'whatsapp_equipment_template_en',
  'whatsapp_studio_template_ar',
  'whatsapp_studio_template_en',
  'packages_seo_title_ar',
  'packages_seo_title_en',
  'packages_seo_description_ar',
  'packages_seo_description_en',
  'equipment_seo_title_ar',
  'equipment_seo_title_en',
  'equipment_seo_description_ar',
  'equipment_seo_description_en',
  'packages_featured_ids',
] as const

export type MarketingSettingKey = (typeof MARKETING_SETTING_KEYS)[number]

const DEFAULT_ROWS: Array<{
  key: string
  label: string
  category: string
  type: string
  value: string
}> = [
  { key: 'ga4_id', label: 'GA4 Measurement ID', category: 'google', type: 'text', value: '' },
  { key: 'gtm_id', label: 'GTM Container ID', category: 'google', type: 'text', value: '' },
  { key: 'gsc_verification', label: 'GSC Verification Code', category: 'google', type: 'text', value: '' },
  { key: 'google_ads_id', label: 'Google Ads Conversion ID', category: 'google', type: 'text', value: '' },
  { key: 'google_ads_label', label: 'Google Ads Conversion Label', category: 'google', type: 'text', value: '' },
  { key: 'google_maps_key', label: 'Google Maps Embed API Key', category: 'google', type: 'text', value: '' },
  { key: 'meta_pixel_id', label: 'Meta Pixel ID', category: 'meta', type: 'text', value: '' },
  { key: 'meta_capi_token', label: 'Meta CAPI Token', category: 'meta', type: 'text', value: '' },
  { key: 'meta_test_code', label: 'Meta Test Event Code', category: 'meta', type: 'text', value: '' },
  { key: 'tiktok_pixel_id', label: 'TikTok Pixel ID', category: 'tiktok', type: 'text', value: '' },
  { key: 'snapchat_pixel_id', label: 'Snapchat Pixel ID', category: 'snapchat', type: 'text', value: '' },
  { key: 'pinterest_tag_id', label: 'Pinterest Tag ID', category: 'pinterest', type: 'text', value: '' },
  { key: 'twitter_pixel_id', label: 'Twitter/X Pixel ID', category: 'twitter', type: 'text', value: '' },
  { key: 'twitter_handle', label: 'Twitter Handle', category: 'twitter', type: 'text', value: '@FlixCam' },
  { key: 'clarity_id', label: 'Microsoft Clarity ID', category: 'microsoft', type: 'text', value: '' },
  { key: 'mailchimp_api_key', label: 'Mailchimp API Key', category: 'email', type: 'text', value: '' },
  { key: 'mailchimp_list_id', label: 'Mailchimp List ID', category: 'email', type: 'text', value: '' },
  { key: 'mailchimp_server', label: 'Mailchimp Server', category: 'email', type: 'text', value: 'us1' },
  { key: 'site_url', label: 'Site URL', category: 'business', type: 'url', value: '' },
  { key: 'site_name', label: 'Site Name (EN)', category: 'business', type: 'text', value: 'FlixCam' },
  { key: 'site_name_ar', label: 'Site Name (AR)', category: 'business', type: 'text', value: 'فليكس كام' },
  { key: 'business_phone', label: 'Business Phone', category: 'business', type: 'text', value: '' },
  { key: 'business_email', label: 'Business Email', category: 'business', type: 'text', value: '' },
  { key: 'whatsapp_number', label: 'WhatsApp (digits)', category: 'business', type: 'text', value: '' },
  { key: 'business_address', label: 'Street Address', category: 'business', type: 'text', value: '' },
  { key: 'business_city', label: 'City', category: 'business', type: 'text', value: 'Riyadh' },
  { key: 'business_country', label: 'Country', category: 'business', type: 'text', value: 'SA' },
  { key: 'business_lat', label: 'Latitude', category: 'business', type: 'text', value: '24.7136' },
  { key: 'business_lng', label: 'Longitude', category: 'business', type: 'text', value: '46.6753' },
  { key: 'business_logo', label: 'Logo URL', category: 'business', type: 'url', value: '' },
  { key: 'og_default_image', label: 'Default OG Image', category: 'seo', type: 'url', value: '' },
  { key: 'twitter_default_image', label: 'Default Twitter Image', category: 'seo', type: 'url', value: '' },
  { key: 'instagram_url', label: 'Instagram', category: 'social', type: 'url', value: '' },
  { key: 'facebook_url', label: 'Facebook', category: 'social', type: 'url', value: '' },
  { key: 'twitter_url', label: 'X/Twitter URL', category: 'social', type: 'url', value: '' },
  { key: 'tiktok_url', label: 'TikTok', category: 'social', type: 'url', value: '' },
  { key: 'youtube_url', label: 'YouTube', category: 'social', type: 'url', value: '' },
  { key: 'linkedin_url', label: 'LinkedIn', category: 'social', type: 'url', value: '' },
  {
    key: 'whatsapp_default_message_ar',
    label: 'WhatsApp default (AR)',
    category: 'social',
    type: 'text',
    value: 'مرحباً، أود الاستفسار عن الخدمات',
  },
  {
    key: 'whatsapp_default_message_en',
    label: 'WhatsApp default (EN)',
    category: 'social',
    type: 'text',
    value: 'Hello, I am interested in FlixCam services',
  },
  {
    key: 'whatsapp_equipment_template_ar',
    label: 'WhatsApp equipment (AR)',
    category: 'social',
    type: 'text',
    value: 'مرحباً، أود الاستفسار عن تأجير: {name}',
  },
  {
    key: 'whatsapp_equipment_template_en',
    label: 'WhatsApp equipment (EN)',
    category: 'social',
    type: 'text',
    value: 'Hi, I am interested in renting: {name}',
  },
  {
    key: 'whatsapp_studio_template_ar',
    label: 'WhatsApp studio (AR)',
    category: 'social',
    type: 'text',
    value: 'مرحباً، أود حجز استوديو: {name}',
  },
  {
    key: 'whatsapp_studio_template_en',
    label: 'WhatsApp studio (EN)',
    category: 'social',
    type: 'text',
    value: 'Hi, I would like to book studio: {name}',
  },
  { key: 'packages_seo_title_ar', label: 'Packages Meta Title (AR)', category: 'seo', type: 'text', value: '' },
  { key: 'packages_seo_title_en', label: 'Packages Meta Title (EN)', category: 'seo', type: 'text', value: '' },
  { key: 'packages_seo_description_ar', label: 'Packages Meta Description (AR)', category: 'seo', type: 'textarea', value: '' },
  { key: 'packages_seo_description_en', label: 'Packages Meta Description (EN)', category: 'seo', type: 'textarea', value: '' },
  { key: 'equipment_seo_title_ar', label: 'Equipment Meta Title (AR)', category: 'seo', type: 'text', value: '' },
  { key: 'equipment_seo_title_en', label: 'Equipment Meta Title (EN)', category: 'seo', type: 'text', value: '' },
  { key: 'equipment_seo_description_ar', label: 'Equipment Meta Description (AR)', category: 'seo', type: 'textarea', value: '' },
  { key: 'equipment_seo_description_en', label: 'Equipment Meta Description (EN)', category: 'seo', type: 'textarea', value: '' },
  { key: 'packages_featured_ids', label: 'Featured Package IDs (Kits)', category: 'seo', type: 'text', value: '' },
]

function pick(db: Map<string, string>, key: string, envVal: string | undefined): string {
  const v = db.get(key)
  if (v !== undefined && v.trim() !== '') return v.trim()
  return (envVal ?? '').trim()
}

export interface PublicMarketingTrackingConfig {
  gtmId: string
  ga4Id: string
  gscVerification: string
  metaPixelId: string
  tiktokPixelId: string
  snapchatPixelId: string
  pinterestTagId: string
  twitterPixelId: string
  clarityId: string
  googleAdsId: string
  googleAdsLabel: string
}

export async function ensureMarketingSettingsSeeded(): Promise<void> {
  for (const row of DEFAULT_ROWS) {
    await prisma.marketingSettings.upsert({
      where: { key: row.key },
      create: {
        key: row.key,
        value: row.value,
        label: row.label,
        category: row.category,
        type: row.type,
      },
      update: {},
    })
  }
}

async function marketingSettingsTableExists(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace ns ON ns.oid = c.relnamespace
      WHERE ns.nspname = 'public' AND c.relname = 'MarketingSettings' AND c.relkind = 'r'
    `
    return Number(rows[0]?.n ?? 0) > 0
  } catch {
    return false
  }
}

export async function getMarketingSettingsMap(): Promise<Map<string, string>> {
  try {
    const exists = await marketingSettingsTableExists()
    if (!exists) return new Map()
    const rows = await prisma.marketingSettings.findMany()
    return new Map(rows.map((r: { key: string; value: string }) => [r.key, r.value]))
  } catch {
    return new Map()
  }
}

export async function getPublicMarketingTrackingConfig(): Promise<PublicMarketingTrackingConfig> {
  try {
    const db = await getMarketingSettingsMap()
    return {
      gtmId: pick(db, 'gtm_id', rootLayoutGtmContainerId()),
      ga4Id: pick(db, 'ga4_id', process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || process.env.GA4_MEASUREMENT_ID),
      gscVerification: pick(db, 'gsc_verification', process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION),
      metaPixelId: pick(db, 'meta_pixel_id', process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID),
      tiktokPixelId: pick(db, 'tiktok_pixel_id', process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID),
      snapchatPixelId: pick(db, 'snapchat_pixel_id', process.env.NEXT_PUBLIC_SNAPCHAT_PIXEL_ID),
      pinterestTagId: pick(db, 'pinterest_tag_id', process.env.NEXT_PUBLIC_PINTEREST_TAG_ID),
      twitterPixelId: pick(db, 'twitter_pixel_id', process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID),
      clarityId: pick(db, 'clarity_id', process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID),
      googleAdsId: pick(db, 'google_ads_id', process.env.GOOGLE_ADS_CONVERSION_ID),
      googleAdsLabel: pick(db, 'google_ads_label', process.env.GOOGLE_ADS_CONVERSION_LABEL),
    }
  } catch {
    const empty = new Map<string, string>()
    return {
      gtmId: pick(empty, 'gtm_id', rootLayoutGtmContainerId()),
      ga4Id: pick(empty, 'ga4_id', process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || process.env.GA4_MEASUREMENT_ID),
      gscVerification: pick(empty, 'gsc_verification', process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION),
      metaPixelId: pick(empty, 'meta_pixel_id', process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID),
      tiktokPixelId: pick(empty, 'tiktok_pixel_id', process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID),
      snapchatPixelId: pick(empty, 'snapchat_pixel_id', process.env.NEXT_PUBLIC_SNAPCHAT_PIXEL_ID),
      pinterestTagId: pick(empty, 'pinterest_tag_id', process.env.NEXT_PUBLIC_PINTEREST_TAG_ID),
      twitterPixelId: pick(empty, 'twitter_pixel_id', process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID),
      clarityId: pick(empty, 'clarity_id', process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID),
      googleAdsId: pick(empty, 'google_ads_id', process.env.GOOGLE_ADS_CONVERSION_ID),
      googleAdsLabel: pick(empty, 'google_ads_label', process.env.GOOGLE_ADS_CONVERSION_LABEL),
    }
  }
}

export async function getMetaCapiCredentials(): Promise<{
  pixelId: string
  token: string
  testCode: string
}> {
  const db = await getMarketingSettingsMap()
  return {
    pixelId: pick(db, 'meta_pixel_id', process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID),
    token: pick(db, 'meta_capi_token', process.env.META_CONVERSIONS_API_TOKEN),
    testCode: pick(db, 'meta_test_code', process.env.META_CONVERSIONS_API_TEST_EVENT_CODE),
  }
}

export async function getMailchimpConfig(): Promise<{
  apiKey: string
  listId: string
  server: string
}> {
  const db = await getMarketingSettingsMap()
  return {
    apiKey: pick(db, 'mailchimp_api_key', process.env.MAILCHIMP_API_KEY),
    listId: pick(db, 'mailchimp_list_id', process.env.MAILCHIMP_LIST_ID),
    server: pick(db, 'mailchimp_server', process.env.MAILCHIMP_SERVER_PREFIX),
  }
}
