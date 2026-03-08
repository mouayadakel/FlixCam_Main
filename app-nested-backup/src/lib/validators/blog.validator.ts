/**
 * @file blog.validator.ts
 * @description Zod validation schemas for blog operations
 */

import { z } from 'zod'

const localizedString = z.object({
  ar: z.string().min(1, 'Arabic text is required'),
  en: z.string().min(1, 'English text is required'),
})

const localizedStringOptional = z.object({
  ar: z.string().optional().nullable(),
  en: z.string().optional().nullable(),
})

export const createPostSchema = z.object({
  titleAr: z.string().min(1, 'Arabic title is required').max(200),
  titleEn: z.string().min(1, 'English title is required').max(200),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(96)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  excerptAr: z.string().min(1, 'Arabic excerpt is required').max(500),
  excerptEn: z.string().min(1, 'English excerpt is required').max(500),
  content: z.record(z.unknown()),
  coverImage: z.string().min(1, 'Cover image is required').url(),
  coverImageAltAr: z.string().optional().nullable(),
  coverImageAltEn: z.string().optional().nullable(),
  categoryId: z.string().cuid(),
  authorId: z.string().cuid(),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']).default('DRAFT'),
  publishedAt: z.coerce.date().optional().nullable(),
  readingTime: z.number().int().min(0).max(120).optional().nullable(),
  featured: z.boolean().default(false),
  trending: z.boolean().default(false),
  tagIds: z.array(z.string().cuid()).default([]),
  metaTitleAr: z.string().max(70).optional().nullable(),
  metaTitleEn: z.string().max(70).optional().nullable(),
  metaDescriptionAr: z.string().max(160).optional().nullable(),
  metaDescriptionEn: z.string().max(160).optional().nullable(),
  metaKeywordsAr: z.string().optional().nullable(),
  metaKeywordsEn: z.string().optional().nullable(),
  ogImage: z.string().url().optional().nullable().or(z.literal('')),
  relatedEquipmentIds: z.array(z.string().cuid()).default([]),
  primaryCtaTextAr: z.string().max(100).optional().nullable(),
  primaryCtaTextEn: z.string().max(100).optional().nullable(),
  primaryCtaUrl: z.string().max(500).optional().nullable(),
  primaryCtaType: z.enum(['equipment', 'studio', 'package', 'contact', 'custom']).optional().nullable(),
  secondaryCtaTextAr: z.string().max(100).optional().nullable(),
  secondaryCtaTextEn: z.string().max(100).optional().nullable(),
  secondaryCtaUrl: z.string().max(500).optional().nullable(),
})

export const updatePostSchema = createPostSchema.partial()

export const searchParamsSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional().transform((v) => {
    if (Array.isArray(v)) return v
    return v ? [v] : []
  }),
  sort: z.enum(['newest', 'popular', 'relevant']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

export const reactionSchema = z.object({
  postId: z.string().cuid(),
  type: z.enum(['HELPFUL_YES', 'HELPFUL_NO']),
})

export const createCategorySchema = z.object({
  nameAr: z.string().min(1, 'Arabic name is required').max(100),
  nameEn: z.string().min(1, 'English name is required').max(100),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  descriptionAr: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  coverImage: z.string().url().optional().nullable().or(z.literal('')),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  parentCategoryId: z.string().cuid().optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

export const updateCategorySchema = createCategorySchema.partial()

export const categoryListParamsSchema = z.object({
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const createTagSchema = z.object({
  nameAr: z.string().min(1, 'Arabic name is required').max(50),
  nameEn: z.string().min(1, 'English name is required').max(50),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
})

export const authorRoleSchema = z.enum(['WRITER', 'EDITOR', 'ADMIN'])

export const createAuthorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z
    .string()
    .max(100)
    .regex(/^[a-z0-9-]*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional()
    .transform((v) => v || undefined),
  email: z.string().email('Valid email is required').max(255),
  bioAr: z.string().optional().nullable(),
  bioEn: z.string().optional().nullable(),
  avatar: z.string().url().optional().nullable().or(z.literal('')),
  role: authorRoleSchema.optional().nullable(),
  userId: z.string().cuid().optional().nullable(),
  twitterUrl: z.string().url().optional().nullable().or(z.literal('')),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal('')),
  instagramUrl: z.string().url().optional().nullable().or(z.literal('')),
  githubUrl: z.string().url().optional().nullable().or(z.literal('')),
  websiteUrl: z.string().url().optional().nullable().or(z.literal('')),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  isActive: z.boolean().default(true),
})

export const updateAuthorSchema = createAuthorSchema.partial()

export const authorListParamsSchema = z.object({
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
/** Form/submit values: schema output with defaults applied (e.g. status required) */
export type CreatePostFormValues = z.output<typeof createPostSchema>
export type UpdatePostInput = z.infer<typeof updatePostSchema>
export type SearchParamsInput = z.infer<typeof searchParamsSchema>
export type ReactionInput = z.infer<typeof reactionSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateTagInput = z.infer<typeof createTagSchema>
export type CreateAuthorInput = z.infer<typeof createAuthorSchema>
export type UpdateAuthorInput = z.infer<typeof updateAuthorSchema>
