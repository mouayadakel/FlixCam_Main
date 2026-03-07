/**
 * @file blog.types.ts
 * @description TypeScript types for the blog system
 */

import type { BlogPostStatus, BlogReactionType } from '@prisma/client'

export type { BlogPostStatus, BlogReactionType }

export interface BlogPostPublic {
  id: string
  titleAr: string
  titleEn: string
  slug: string
  excerptAr: string
  excerptEn: string
  content: unknown
  coverImage: string
  coverImageAltAr: string | null
  coverImageAltEn: string | null
  category: BlogCategoryPublic
  author: BlogAuthorPublic
  tags: BlogTagPublic[]
  status: BlogPostStatus
  publishedAt: Date | null
  readingTime: number | null
  featured: boolean
  trending: boolean
  views: number
  metaTitleAr: string | null
  metaTitleEn: string | null
  metaDescriptionAr: string | null
  metaDescriptionEn: string | null
  metaKeywordsAr: string | null
  metaKeywordsEn: string | null
  ogImage: string | null
  relatedEquipmentIds: string[]
  primaryCtaTextAr: string | null
  primaryCtaTextEn: string | null
  primaryCtaUrl: string | null
  primaryCtaType: string | null
  secondaryCtaTextAr: string | null
  secondaryCtaTextEn: string | null
  secondaryCtaUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface BlogCategoryPublic {
  id: string
  nameAr: string
  nameEn: string
  slug: string
  descriptionAr: string | null
  descriptionEn: string | null
  icon: string | null
  sortOrder: number
}

export interface BlogTagPublic {
  id: string
  nameAr: string
  nameEn: string
  slug: string
}

export interface BlogAuthorPublic {
  id: string
  name: string
  bioAr: string | null
  bioEn: string | null
  avatar: string | null
  role: string | null
}

export interface BlogPostListItem {
  id: string
  titleAr: string
  titleEn: string
  slug: string
  excerptAr: string
  excerptEn: string
  coverImage: string
  coverImageAltAr: string | null
  coverImageAltEn: string | null
  category: BlogCategoryPublic
  author: BlogAuthorPublic
  tags: BlogTagPublic[]
  status: BlogPostStatus
  publishedAt: Date | null
  readingTime: number | null
  featured: boolean
  trending: boolean
  views: number
  createdAt: Date
}

export interface BlogSearchParams {
  q?: string
  category?: string
  tags?: string[]
  sort?: 'newest' | 'popular' | 'relevant'
  page?: number
  limit?: number
}

export interface BlogSearchResult {
  posts: BlogPostListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ReactionCounts {
  helpfulYes: number
  helpfulNo: number
}

export interface BlogCategoryAdmin {
  id: string
  nameAr: string
  nameEn: string
  slug: string
  descriptionAr: string | null
  descriptionEn: string | null
  icon: string | null
  coverImage: string | null
  metaTitle: string | null
  metaDescription: string | null
  parentCategoryId: string | null
  parent?: { id: string; nameAr: string; nameEn: string; slug: string } | null
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count?: { posts: number }
}

export interface BlogAuthorAdmin {
  id: string
  name: string
  slug: string | null
  email: string | null
  bioAr: string | null
  bioEn: string | null
  avatar: string | null
  role: string | null
  userId: string | null
  twitterUrl: string | null
  linkedinUrl: string | null
  instagramUrl: string | null
  githubUrl: string | null
  websiteUrl: string | null
  metaTitle: string | null
  metaDescription: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  _count?: { posts: number }
}

export interface BlogAiUsageStats {
  totalCallsToday: number
  totalCostToday: number
  byEndpoint: Array<{ endpoint: string; calls: number; cost: number }>
  topUsers: Array<{ userId: string; calls: number; cost: number }>
}
