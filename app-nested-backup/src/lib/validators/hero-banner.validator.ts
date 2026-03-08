/**
 * @file hero-banner.validator.ts
 * @description Zod validation schemas for hero banners and slides
 * @module validators/hero-banner
 */

import { z } from 'zod'

const urlOptional = z.string().url().optional().nullable().or(z.literal(''))
const urlRequired = z.string().min(1, 'Image URL is required').url()

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

export const createSlideSchema = z.object({
  imageUrl: urlRequired,
  mobileImageUrl: urlOptional,
  videoUrl: urlOptional,

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
