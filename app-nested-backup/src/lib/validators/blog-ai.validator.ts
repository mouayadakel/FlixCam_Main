/**
 * Zod schemas for blog AI API endpoints.
 */

import { z } from 'zod'

export const generateOutlineSchema = z.object({
  title: z.string().min(1).max(200),
  language: z.enum(['ar', 'en']).default('en'),
})

export const generateDraftSchema = z.object({
  outline: z.string().min(1).max(10000),
  title: z.string().min(1).max(200),
  language: z.enum(['ar', 'en']).default('en'),
})

export const rewriteSchema = z.object({
  content: z.string().min(1).max(20000),
  tone: z.enum(['professional', 'casual', 'technical']).default('professional'),
  language: z.enum(['ar', 'en']).default('en'),
})

export const translateSchema = z.object({
  content: z.string().min(1).max(20000),
  from: z.enum(['ar', 'en']),
  to: z.enum(['ar', 'en']),
})

export const seoMetaSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.union([z.string(), z.record(z.unknown())]),
  language: z.enum(['ar', 'en']).default('en'),
})

export const faqSchema = z.object({
  content: z.union([z.string(), z.record(z.unknown())]),
  language: z.enum(['ar', 'en']).default('en'),
})

export const extractEquipmentSchema = z.object({
  content: z.union([z.string(), z.record(z.unknown())]),
})

export const altTextSchema = z.object({
  imageUrl: z.string().url(),
  context: z.string().max(500).optional(),
  language: z.enum(['ar', 'en']).default('en'),
})

export const qualityScoreSchema = z.object({
  content: z.union([z.string(), z.record(z.unknown())]),
})

export const seoScoreSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.union([z.string(), z.record(z.unknown())]),
  meta: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
})

export const suggestLinksSchema = z.object({
  content: z.union([z.string(), z.record(z.unknown())]),
})

export const relatedPostsSchema = z.object({
  postId: z.string().cuid(),
  content: z.union([z.string(), z.record(z.unknown())]),
})

export const headlineOptimizerSchema = z.object({
  title: z.string().min(1).max(200),
  language: z.enum(['ar', 'en']).default('en'),
})

export const autoTagsSchema = z.object({
  content: z.union([z.string(), z.record(z.unknown())]),
})
