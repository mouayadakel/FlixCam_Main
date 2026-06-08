/**
 * @file hero-banner.validator.ts
 * @description Zod validation schemas for hero banners and slides
 * @module validators/hero-banner
 */

import { z } from 'zod'

/** https? URLs or same-site paths (e.g. `/uploads/cms/...` from admin upload). */
export function isValidWebsiteMediaUrl(value: string): boolean {
  const t = value.trim()
  if (!t) return false
  if (t.startsWith('/')) {
    if (t.startsWith('//')) return false
    if (t.includes('..')) return false
    return /^\/[\w/.?%=#&~-]+$/i.test(t) && t.length >= 2
  }
  try {
    const u = new URL(t)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const slideMediaUrlRequired = z
  .string()
  .min(1, 'Image URL is required')
  .refine((s) => isValidWebsiteMediaUrl(s), {
    message: 'Must be a valid http(s) URL or absolute path (e.g. /uploads/...)',
  })

const slideMediaUrlOptional = z.preprocess(
  (v) => (v === null || v === undefined || v === '' ? undefined : String(v).trim()),
  z.union([
    z.undefined(),
    z.string().refine((s) => isValidWebsiteMediaUrl(s), {
      message: 'Must be a valid http(s) URL or absolute path',
    }),
  ])
)

/** Optional absolute http(s) URL (e.g. external video). Paths not used for videoUrl today. */
const videoUrlOptional = z.preprocess(
  (v) => (v === null || v === undefined || v === '' ? undefined : String(v).trim()),
  z.union([
    z.undefined(),
    z.string().url({ message: 'Must be a valid http(s) URL' }),
  ])
)

export const createBannerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  pageSlug: z
    .string()
    .min(1, 'Page slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Page slug must be lowercase alphanumeric with hyphens'),
  isActive: z.boolean().optional().default(true),
  autoPlay: z.boolean().optional().default(true),
  autoPlayInterval: z.number().int().min(1000).max(30000).optional().default(6000),
  transitionType: z.enum(['fade', 'slide', 'zoom']).optional().default('fade'),
})

export const updateBannerSchema = createBannerSchema.partial()

const slideAspectRatioSchema = z.enum(['auto', '1/1', '4/5', '3/4', '9/16', '16/9'])

export const createSlideSchema = z.object({
  imageUrl: slideMediaUrlRequired,
  mobileImageUrl: slideMediaUrlOptional,
  mobileAspectRatio: slideAspectRatioSchema.optional(),
  mobileFocalX: z.number().min(0).max(100).optional(),
  mobileFocalY: z.number().min(0).max(100).optional(),
  desktopAspectRatio: slideAspectRatioSchema.optional(),
  desktopFocalX: z.number().min(0).max(100).optional(),
  desktopFocalY: z.number().min(0).max(100).optional(),
  videoUrl: videoUrlOptional,

  titleAr: z.string().min(1, 'Arabic title is required').max(500),
  titleEn: z.string().min(1, 'English title is required').max(500),
  titleZh: z.string().max(500).optional().nullable().or(z.literal('')),

  subtitleAr: z.string().max(1000).optional().nullable().or(z.literal('')),
  subtitleEn: z.string().max(1000).optional().nullable().or(z.literal('')),
  subtitleZh: z.string().max(1000).optional().nullable().or(z.literal('')),

  badgeTextAr: z.string().max(100).optional().nullable().or(z.literal('')),
  badgeTextEn: z.string().max(100).optional().nullable().or(z.literal('')),
  badgeTextZh: z.string().max(100).optional().nullable().or(z.literal('')),

  ctaTextAr: z.string().max(100).optional().nullable().or(z.literal('')),
  ctaTextEn: z.string().max(100).optional().nullable().or(z.literal('')),
  ctaTextZh: z.string().max(100).optional().nullable().or(z.literal('')),
  ctaUrl: z.string().max(500).optional().nullable().or(z.literal('')),
  ctaStyle: z.enum(['primary', 'secondary', 'outline', 'ghost']).optional().default('primary'),

  cta2TextAr: z.string().max(100).optional().nullable().or(z.literal('')),
  cta2TextEn: z.string().max(100).optional().nullable().or(z.literal('')),
  cta2TextZh: z.string().max(100).optional().nullable().or(z.literal('')),
  cta2Url: z.string().max(500).optional().nullable().or(z.literal('')),
  cta2Style: z.enum(['primary', 'secondary', 'outline', 'ghost']).optional().nullable(),

  order: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  overlayOpacity: z.number().min(0).max(1).optional().default(0.3),
  textPosition: z.enum(['start', 'center', 'end']).optional().default('start'),

  publishAt: z.coerce.date().optional().nullable(),
  unpublishAt: z.coerce.date().optional().nullable(),
})

export const updateSlideSchema = createSlideSchema.partial()

export const reorderSlidesSchema = z.object({
  slideIds: z.array(z.string().cuid()).min(0),
})

export type CreateBannerInput = z.infer<typeof createBannerSchema>
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>
export type CreateSlideInput = z.infer<typeof createSlideSchema>
export type UpdateSlideInput = z.infer<typeof updateSlideSchema>
export type ReorderSlidesInput = z.infer<typeof reorderSlidesSchema>
