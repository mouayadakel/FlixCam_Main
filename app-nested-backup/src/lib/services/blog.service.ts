/**
 * @file blog.service.ts
 * @description Business logic for blog posts, categories, tags, and authors
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError, ValidationError } from '@/lib/errors'
import type {
  BlogAiUsageStats,
  BlogAuthorAdmin,
  BlogCategoryAdmin,
  BlogPostListItem,
  BlogPostPublic,
  BlogSearchParams,
  BlogSearchResult,
  ReactionCounts,
} from '@/lib/types/blog.types'
import type {
  CreateAuthorInput,
  CreateCategoryInput,
  CreatePostInput,
  UpdateAuthorInput,
  UpdateCategoryInput,
  UpdatePostInput,
} from '@/lib/validators/blog.validator'
import { slugify } from '@/lib/utils'
import { BlogPostStatus } from '@prisma/client'

const POST_LIST_SELECT = {
  id: true,
  titleAr: true,
  titleEn: true,
  slug: true,
  excerptAr: true,
  excerptEn: true,
  coverImage: true,
  coverImageAltAr: true,
  coverImageAltEn: true,
  status: true,
  publishedAt: true,
  readingTime: true,
  featured: true,
  trending: true,
  views: true,
  createdAt: true,
  category: {
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      slug: true,
      descriptionAr: true,
      descriptionEn: true,
      icon: true,
      sortOrder: true,
    },
  },
  author: {
    select: {
      id: true,
      name: true,
      bioAr: true,
      bioEn: true,
      avatar: true,
      role: true,
    },
  },
  tags: {
    include: {
      tag: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          slug: true,
        },
      },
    },
  },
} as const

function toListItem(row: {
  id: string
  titleAr: string
  titleEn: string
  slug: string
  excerptAr: string
  excerptEn: string
  coverImage: string
  coverImageAltAr: string | null
  coverImageAltEn: string | null
  status: BlogPostStatus
  publishedAt: Date | null
  readingTime: number | null
  featured: boolean
  trending: boolean
  views: number
  createdAt: Date
  category: { id: string; nameAr: string; nameEn: string; slug: string; descriptionAr: string | null; descriptionEn: string | null; icon: string | null; sortOrder: number }
  author: { id: string; name: string; bioAr: string | null; bioEn: string | null; avatar: string | null; role: string | null }
  tags: Array<{ tag: { id: string; nameAr: string; nameEn: string; slug: string } }>
}): BlogPostListItem {
  return {
    id: row.id,
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    slug: row.slug,
    excerptAr: row.excerptAr,
    excerptEn: row.excerptEn,
    coverImage: row.coverImage,
    coverImageAltAr: row.coverImageAltAr,
    coverImageAltEn: row.coverImageAltEn,
    category: row.category,
    author: row.author,
    tags: row.tags.map((t) => t.tag),
    status: row.status,
    publishedAt: row.publishedAt,
    readingTime: row.readingTime,
    featured: row.featured,
    trending: row.trending,
    views: row.views,
    createdAt: row.createdAt,
  }
}

const publishedWhere = {
  deletedAt: null,
  status: BlogPostStatus.PUBLISHED,
  OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
}

export class BlogService {
  /**
   * Get posts for admin listing (all statuses, no published filter). Paginated.
   */
  static async getPostsForAdmin(params: BlogSearchParams): Promise<BlogSearchResult> {
    const { q, category, tags, sort = 'newest', page = 1, limit = 20 } = params

    const where: Record<string, unknown> = { deletedAt: null }

    if (category) {
      where.category = { slug: category, deletedAt: null }
    }

    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          tag: { slug: { in: tags }, deletedAt: null },
        },
      }
    }

    if (q && q.trim()) {
      const search = q.trim()
      where.OR = [
        { titleAr: { contains: search, mode: 'insensitive' } },
        { titleEn: { contains: search, mode: 'insensitive' } },
        { excerptAr: { contains: search, mode: 'insensitive' } },
        { excerptEn: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ]
    }

    const orderBy =
      sort === 'popular'
        ? [{ views: 'desc' as const }, { publishedAt: 'desc' as const }]
        : sort === 'relevant' && q
          ? [{ views: 'desc' as const }, { publishedAt: 'desc' as const }]
          : { publishedAt: 'desc' as const }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        select: POST_LIST_SELECT,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ])

    return {
      posts: posts.map(toListItem),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Get posts for public listing (paginated, filtered).
   */
  static async getPosts(params: BlogSearchParams): Promise<BlogSearchResult> {
    const { q, category, tags, sort = 'newest', page = 1, limit = 12 } = params

    const where: Record<string, unknown> = { ...publishedWhere }

    if (category) {
      where.category = { slug: category, deletedAt: null }
    }

    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          tag: { slug: { in: tags }, deletedAt: null },
        },
      }
    }

    if (q && q.trim()) {
      const search = `%${q.trim()}%`
      where.OR = [
        { titleAr: { contains: q.trim(), mode: 'insensitive' } },
        { titleEn: { contains: q.trim(), mode: 'insensitive' } },
        { excerptAr: { contains: q.trim(), mode: 'insensitive' } },
        { excerptEn: { contains: q.trim(), mode: 'insensitive' } },
      ]
    }

    const orderBy =
      sort === 'popular'
        ? [{ views: 'desc' as const }, { publishedAt: 'desc' as const }]
        : sort === 'relevant' && q
          ? [{ views: 'desc' as const }, { publishedAt: 'desc' as const }]
          : { publishedAt: 'desc' as const }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        select: POST_LIST_SELECT,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ])

    return {
      posts: posts.map(toListItem),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Get single post by slug (public). Returns null if not found or not published.
   */
  static async getPostBySlug(slug: string, options?: { allowDraft?: boolean; previewToken?: string }): Promise<BlogPostPublic | null> {
    const allowDraft = options?.allowDraft ?? false
    const previewToken = options?.previewToken
    const isValidPreview = previewToken && process.env.BLOG_PREVIEW_TOKEN && previewToken === process.env.BLOG_PREVIEW_TOKEN

    const where: Record<string, unknown> = { slug, deletedAt: null }
    if (!allowDraft && !isValidPreview) {
      where.status = BlogPostStatus.PUBLISHED
      where.OR = [{ publishedAt: null }, { publishedAt: { lte: new Date() } }]
    }

    const post = await prisma.blogPost.findFirst({
      where,
      include: {
        category: { select: { id: true, nameAr: true, nameEn: true, slug: true, descriptionAr: true, descriptionEn: true, icon: true, sortOrder: true } },
        author: { select: { id: true, name: true, bioAr: true, bioEn: true, avatar: true, role: true } },
        tags: { include: { tag: { select: { id: true, nameAr: true, nameEn: true, slug: true } } } },
      },
    })

    if (!post) return null

    return {
      ...post,
      tags: post.tags.map((t) => t.tag),
    } as BlogPostPublic
  }

  /**
   * Get featured posts for hero (up to 3).
   */
  static async getFeaturedPosts(limit = 3): Promise<BlogPostListItem[]> {
    const posts = await prisma.blogPost.findMany({
      where: { ...publishedWhere, featured: true },
      select: POST_LIST_SELECT,
      orderBy: [{ publishedAt: 'desc' }],
      take: limit,
    })
    return posts.map(toListItem)
  }

  /**
   * Get posts by category slug.
   */
  static async getPostsByCategory(categorySlug: string, page = 1, limit = 12): Promise<BlogSearchResult> {
    return BlogService.getPosts({
      category: categorySlug,
      sort: 'newest',
      page,
      limit,
    })
  }

  /**
   * Get posts by tag slug.
   */
  static async getPostsByTag(tagSlug: string, page = 1, limit = 12): Promise<BlogSearchResult> {
    return BlogService.getPosts({
      tags: [tagSlug],
      sort: 'newest',
      page,
      limit,
    })
  }

  /**
   * Get related posts (same category, excluding current).
   */
  static async getRelatedPosts(postId: string, categoryId: string, limit = 3): Promise<BlogPostListItem[]> {
    const posts = await prisma.blogPost.findMany({
      where: {
        ...publishedWhere,
        id: { not: postId },
        categoryId,
      },
      select: POST_LIST_SELECT,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    })
    return posts.map(toListItem)
  }

  /**
   * Get trending posts (most views in last 7 days).
   */
  static async getTrendingPosts(limit = 5): Promise<BlogPostListItem[]> {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const viewed = await prisma.blogView.groupBy({
      by: ['postId'],
      where: { createdAt: { gte: weekAgo } },
      _count: { postId: true },
      orderBy: { _count: { postId: 'desc' } },
      take: limit * 2,
    })

    const postIds = viewed.map((v) => v.postId)
    if (postIds.length === 0) {
      const fallback = await prisma.blogPost.findMany({
        where: publishedWhere,
        select: POST_LIST_SELECT,
        orderBy: { views: 'desc' },
        take: limit,
      })
      return fallback.map(toListItem)
    }

    const posts = await prisma.blogPost.findMany({
      where: { id: { in: postIds }, ...publishedWhere },
      select: POST_LIST_SELECT,
    })
    const byId = new Map(posts.map((p) => [p.id, p]))
    const ordered = postIds.map((id) => byId.get(id)).filter(Boolean) as typeof posts
    return ordered.slice(0, limit).map(toListItem)
  }

  /**
   * Search posts (used by API).
   */
  static async searchPosts(params: BlogSearchParams): Promise<BlogSearchResult> {
    return BlogService.getPosts(params)
  }

  /**
   * Get all published posts for RSS/sitemap (minimal fields).
   */
  static async getPostsForFeed(limit = 100): Promise<
    Array<{
      slug: string
      titleAr: string
      titleEn: string
      excerptAr: string
      excerptEn: string
      coverImage: string
      publishedAt: Date | null
      updatedAt: Date
      featured: boolean
      trending: boolean
      category: { slug: string; nameAr: string; nameEn: string }
      author: { name: string }
    }>
  > {
    const posts = await prisma.blogPost.findMany({
      where: publishedWhere,
      select: {
        slug: true,
        titleAr: true,
        titleEn: true,
        excerptAr: true,
        excerptEn: true,
        coverImage: true,
        publishedAt: true,
        updatedAt: true,
        featured: true,
        trending: true,
        category: { select: { slug: true, nameAr: true, nameEn: true } },
        author: { select: { name: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    })
    return posts
  }

  /**
   * Create a new post (admin).
   */
  static async createPost(data: CreatePostInput, userId: string): Promise<BlogPostPublic> {
    const { tagIds, ...rest } = data
    const post = await prisma.blogPost.create({
      data: {
        ...rest,
        content: (rest.content ?? {}) as Prisma.InputJsonValue,
        createdBy: userId,
        updatedBy: userId,
        tags: tagIds?.length
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        category: { select: { id: true, nameAr: true, nameEn: true, slug: true, descriptionAr: true, descriptionEn: true, icon: true, sortOrder: true } },
        author: { select: { id: true, name: true, bioAr: true, bioEn: true, avatar: true, role: true } },
        tags: { include: { tag: { select: { id: true, nameAr: true, nameEn: true, slug: true } } } },
      },
    })
    const tags = 'tags' in post && Array.isArray(post.tags) ? post.tags.map((t: { tag: { id: string; nameAr: string; nameEn: string; slug: string } }) => t.tag) : []
    return { ...post, tags } as unknown as BlogPostPublic
  }

  /**
   * Update a post (admin).
   */
  static async updatePost(id: string, data: UpdatePostInput, userId: string): Promise<BlogPostPublic> {
    const existing = await prisma.blogPost.findFirst({ where: { id, deletedAt: null }, select: { content: true } })
    if (!existing) throw new NotFoundError('Blog post', id)

    const { tagIds, ...rest } = data
    const updateData: Record<string, unknown> = { ...rest, updatedBy: userId }
    delete updateData.tagIds
    if (tagIds !== undefined) {
      await prisma.blogPostTag.deleteMany({ where: { postId: id } })
      if (tagIds.length > 0) {
        ;(updateData as { tags?: { create: { tagId: string }[] } }).tags = { create: tagIds.map((tagId) => ({ tagId })) }
      }
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.blogPost.update>[0]['data'],
      include: {
        category: { select: { id: true, nameAr: true, nameEn: true, slug: true, descriptionAr: true, descriptionEn: true, icon: true, sortOrder: true } },
        author: { select: { id: true, name: true, bioAr: true, bioEn: true, avatar: true, role: true } },
        tags: { include: { tag: { select: { id: true, nameAr: true, nameEn: true, slug: true } } } },
      },
    })

    if (data.content && JSON.stringify(data.content) !== JSON.stringify(existing.content)) {
      await prisma.blogRevision.create({
        data: { postId: id, content: existing.content as object, editedBy: userId },
      })
    }

    return { ...post, tags: post.tags.map((t) => t.tag) } as BlogPostPublic
  }

  /**
   * Publish scheduled posts whose publishedAt has passed.
   * Call from cron or revalidate webhook.
   */
  static async publishScheduledPosts(): Promise<number> {
    const now = new Date()
    const result = await prisma.blogPost.updateMany({
      where: {
        status: BlogPostStatus.SCHEDULED,
        publishedAt: { lte: now },
        deletedAt: null,
      },
      data: { status: BlogPostStatus.PUBLISHED },
    })
    return result.count
  }

  /**
   * Get revision history for a post (admin).
   */
  static async getRevisions(postId: string): Promise<
    Array<{
      id: string
      content: unknown
      editedBy: string | null
      createdAt: Date
    }>
  > {
    const revisions = await prisma.blogRevision.findMany({
      where: { postId },
      select: { id: true, content: true, editedBy: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return revisions
  }

  /**
   * Soft delete a post (admin).
   */
  static async deletePost(id: string, userId: string): Promise<void> {
    const post = await prisma.blogPost.findFirst({ where: { id, deletedAt: null } })
    if (!post) throw new NotFoundError('Blog post', id)
    await prisma.blogPost.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    })
  }

  /**
   * Increment view count (IP-deduplicated via caller).
   */
  static async incrementViews(postId: string, ipHash: string, userAgent?: string, referrer?: string): Promise<void> {
    await prisma.$transaction([
      prisma.blogView.create({ data: { postId, ipHash, userAgent, referrer } }),
      prisma.blogPost.update({ where: { id: postId }, data: { views: { increment: 1 } } }),
    ])
  }

  /**
   * Add reaction (one per IP per post). Returns updated counts.
   */
  static async addReaction(postId: string, type: 'HELPFUL_YES' | 'HELPFUL_NO', ipHash: string): Promise<ReactionCounts> {
    await prisma.blogReaction.upsert({
      where: { postId_ipHash: { postId, ipHash } },
      create: { postId, type, ipHash },
      update: { type },
    })
    return BlogService.getReactionCounts(postId)
  }

  /**
   * Get reaction counts for a post.
   */
  static async getReactionCounts(postId: string): Promise<ReactionCounts> {
    const [helpfulYes, helpfulNo] = await Promise.all([
      prisma.blogReaction.count({ where: { postId, type: 'HELPFUL_YES' } }),
      prisma.blogReaction.count({ where: { postId, type: 'HELPFUL_NO' } }),
    ])
    return { helpfulYes, helpfulNo }
  }

  /**
   * Get all categories (active, for filters).
   */
  static async getCategories(): Promise<{ id: string; nameAr: string; nameEn: string; slug: string; sortOrder: number }[]> {
    return prisma.blogCategory.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, nameAr: true, nameEn: true, slug: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    })
  }

  /**
   * Get all tags (for filters).
   */
  static async getTags(): Promise<{ id: string; nameAr: string; nameEn: string; slug: string }[]> {
    return prisma.blogTag.findMany({
      where: { deletedAt: null },
      select: { id: true, nameAr: true, nameEn: true, slug: true },
      orderBy: { nameEn: 'asc' },
    })
  }

  /**
   * Get all authors (for admin select).
   */
  static async getAuthors(): Promise<{ id: string; name: string; avatar: string | null; role: string | null }[]> {
    return prisma.blogAuthor.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, avatar: true, role: true },
      orderBy: { name: 'asc' },
    })
  }

  /**
   * Get categories for admin listing (paginated, with search, postCount).
   */
  static async getCategoriesForAdmin(params: {
    search?: string
    page?: number
    pageSize?: number
  }): Promise<{ items: BlogCategoryAdmin[]; total: number; page: number; pageSize: number }> {
    const { search = '', page = 1, pageSize = 20 } = params
    const where: Record<string, unknown> = { deletedAt: null }
    if (search.trim()) {
      const s = search.trim()
      where.OR = [
        { nameAr: { contains: s, mode: 'insensitive' } },
        { nameEn: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
      ]
    }
    const [items, total] = await Promise.all([
      prisma.blogCategory.findMany({
        where,
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          slug: true,
          descriptionAr: true,
          descriptionEn: true,
          icon: true,
          coverImage: true,
          metaTitle: true,
          metaDescription: true,
          parentCategoryId: true,
          sortOrder: true,
          isActive: true,
          createdAt: true,
          _count: { select: { posts: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.blogCategory.count({ where }),
    ])
    const parentIds = [...new Set(items.map((c) => c.parentCategoryId).filter(Boolean))] as string[]
    const parents =
      parentIds.length > 0
        ? await prisma.blogCategory.findMany({
            where: { id: { in: parentIds } },
            select: { id: true, nameAr: true, nameEn: true, slug: true },
          })
        : []
    const parentMap = new Map(parents.map((p) => [p.id, p]))
    const itemsWithParent = items.map((c) => ({
      ...c,
      parent: c.parentCategoryId ? parentMap.get(c.parentCategoryId) ?? null : null,
    }))
    return { items: itemsWithParent as BlogCategoryAdmin[], total, page, pageSize }
  }

  /**
   * Get category by ID (admin).
   */
  static async getCategoryById(id: string): Promise<BlogCategoryAdmin | null> {
    const cat = await prisma.blogCategory.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        slug: true,
        descriptionAr: true,
        descriptionEn: true,
        icon: true,
        coverImage: true,
        metaTitle: true,
        metaDescription: true,
        parentCategoryId: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        _count: { select: { posts: true } },
      },
    })
    if (!cat) return null
    const parent = cat.parentCategoryId
      ? await prisma.blogCategory.findFirst({
          where: { id: cat.parentCategoryId },
          select: { id: true, nameAr: true, nameEn: true, slug: true },
        })
      : null
    return { ...cat, parent } as BlogCategoryAdmin
  }

  /**
   * Create category.
   */
  static async createCategory(data: CreateCategoryInput, userId: string): Promise<BlogCategoryAdmin> {
    const slug = data.slug.trim()
    const existing = await prisma.blogCategory.findFirst({
      where: { slug, deletedAt: null },
    })
    if (existing) {
      throw new ValidationError('A category with this slug already exists', { slug: ['Slug must be unique'] })
    }
    const cat = await prisma.blogCategory.create({
      data: {
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        slug,
        descriptionAr: data.descriptionAr ?? null,
        descriptionEn: data.descriptionEn ?? null,
        icon: data.icon ?? null,
        coverImage: data.coverImage || null,
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        parentCategoryId: data.parentCategoryId ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        slug: true,
        descriptionAr: true,
        descriptionEn: true,
        icon: true,
        coverImage: true,
        metaTitle: true,
        metaDescription: true,
        parentCategoryId: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        _count: { select: { posts: true } },
      },
    })
    const parent = cat.parentCategoryId
      ? await prisma.blogCategory.findFirst({
          where: { id: cat.parentCategoryId },
          select: { id: true, nameAr: true, nameEn: true, slug: true },
        })
      : null
    return { ...cat, parent } as BlogCategoryAdmin
  }

  /**
   * Update category.
   */
  static async updateCategory(id: string, data: UpdateCategoryInput, userId: string): Promise<BlogCategoryAdmin> {
    const existing = await prisma.blogCategory.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundError('Category not found')
    if (data.slug && data.slug !== existing.slug) {
      const taken = await prisma.blogCategory.findFirst({
        where: { slug: data.slug, deletedAt: null, id: { not: id } },
      })
      if (taken) {
        throw new ValidationError('A category with this slug already exists', { slug: ['Slug must be unique'] })
      }
    }
    const cat = await prisma.blogCategory.update({
      where: { id },
      data: {
        ...(data.nameAr !== undefined && { nameAr: data.nameAr }),
        ...(data.nameEn !== undefined && { nameEn: data.nameEn }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.descriptionAr !== undefined && { descriptionAr: data.descriptionAr }),
        ...(data.descriptionEn !== undefined && { descriptionEn: data.descriptionEn }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.coverImage !== undefined && { coverImage: data.coverImage || null }),
        ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle }),
        ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
        ...(data.parentCategoryId !== undefined && { parentCategoryId: data.parentCategoryId }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedBy: userId,
      },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        slug: true,
        descriptionAr: true,
        descriptionEn: true,
        icon: true,
        coverImage: true,
        metaTitle: true,
        metaDescription: true,
        parentCategoryId: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        _count: { select: { posts: true } },
      },
    })
    const parent = cat.parentCategoryId
      ? await prisma.blogCategory.findFirst({
          where: { id: cat.parentCategoryId },
          select: { id: true, nameAr: true, nameEn: true, slug: true },
        })
      : null
    return { ...cat, parent } as BlogCategoryAdmin
  }

  /**
   * Delete category (soft delete). Optionally reassign posts to another category.
   */
  static async deleteCategory(
    id: string,
    userId: string,
    reassignToCategoryId?: string | null
  ): Promise<void> {
    const existing = await prisma.blogCategory.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundError('Category not found')
    if (reassignToCategoryId && reassignToCategoryId !== id) {
      await prisma.blogPost.updateMany({
        where: { categoryId: id },
        data: { categoryId: reassignToCategoryId, updatedBy: userId },
      })
    } else {
      const postCount = await prisma.blogPost.count({ where: { categoryId: id, deletedAt: null } })
      if (postCount > 0) {
        throw new ValidationError(
          'Cannot delete category with posts. Reassign posts to another category first.',
          { reassignTo: ['Required when category has posts'] }
        )
      }
    }
    await prisma.blogCategory.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    })
  }

  /**
   * Get authors for admin listing (paginated, with search, postCount).
   */
  static async getAuthorsForAdmin(params: {
    search?: string
    page?: number
    pageSize?: number
  }): Promise<{ items: BlogAuthorAdmin[]; total: number; page: number; pageSize: number }> {
    const { search = '', page = 1, pageSize = 20 } = params
    const where: Record<string, unknown> = { deletedAt: null }
    if (search.trim()) {
      const s = search.trim()
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
      ]
    }
    const [items, total] = await Promise.all([
      prisma.blogAuthor.findMany({
        where,
        include: { _count: { select: { posts: true } } },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.blogAuthor.count({ where }),
    ])
    return { items: items as BlogAuthorAdmin[], total, page, pageSize }
  }

  /**
   * Get author by ID (admin).
   */
  static async getAuthorById(id: string): Promise<BlogAuthorAdmin | null> {
    const author = await prisma.blogAuthor.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { posts: true } } },
    })
    return author as BlogAuthorAdmin | null
  }

  /**
   * Create author.
   */
  static async createAuthor(data: CreateAuthorInput, userId: string): Promise<BlogAuthorAdmin> {
    const slug = data.slug?.trim() || slugify(data.name)
    const existingSlug = await prisma.blogAuthor.findFirst({
      where: { slug, deletedAt: null },
    })
    if (existingSlug) {
      throw new ValidationError('An author with this slug already exists', { slug: ['Slug must be unique'] })
    }
    if (data.email) {
      const existingEmail = await prisma.blogAuthor.findFirst({
        where: { email: data.email, deletedAt: null },
      })
      if (existingEmail) {
        throw new ValidationError('An author with this email already exists', { email: ['Email must be unique'] })
      }
    }
    const author = await prisma.blogAuthor.create({
      data: {
        name: data.name,
        slug,
        email: data.email ?? null,
        bioAr: data.bioAr ?? null,
        bioEn: data.bioEn ?? null,
        avatar: data.avatar || null,
        role: data.role ?? null,
        userId: data.userId ?? null,
        twitterUrl: data.twitterUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        instagramUrl: data.instagramUrl || null,
        githubUrl: data.githubUrl || null,
        websiteUrl: data.websiteUrl || null,
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        isActive: data.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { _count: { select: { posts: true } } },
    })
    return author as BlogAuthorAdmin
  }

  /**
   * Update author.
   */
  static async updateAuthor(id: string, data: UpdateAuthorInput, userId: string): Promise<BlogAuthorAdmin> {
    const existing = await prisma.blogAuthor.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundError('Author not found')
    const slug = data.slug?.trim() ?? existing.slug
    if (slug && slug !== existing.slug) {
      const taken = await prisma.blogAuthor.findFirst({
        where: { slug, deletedAt: null, id: { not: id } },
      })
      if (taken) {
        throw new ValidationError('An author with this slug already exists', { slug: ['Slug must be unique'] })
      }
    }
    if (data.email !== undefined && data.email !== existing.email) {
      const taken = await prisma.blogAuthor.findFirst({
        where: { email: data.email ?? '', deletedAt: null, id: { not: id } },
      })
      if (taken) {
        throw new ValidationError('An author with this email already exists', { email: ['Email must be unique'] })
      }
    }
    const author = await prisma.blogAuthor.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: (data.slug && data.slug.trim()) || slugify(data.name || existing.name) }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.bioAr !== undefined && { bioAr: data.bioAr }),
        ...(data.bioEn !== undefined && { bioEn: data.bioEn }),
        ...(data.avatar !== undefined && { avatar: data.avatar || null }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.userId !== undefined && { userId: data.userId }),
        ...(data.twitterUrl !== undefined && { twitterUrl: data.twitterUrl || null }),
        ...(data.linkedinUrl !== undefined && { linkedinUrl: data.linkedinUrl || null }),
        ...(data.instagramUrl !== undefined && { instagramUrl: data.instagramUrl || null }),
        ...(data.githubUrl !== undefined && { githubUrl: data.githubUrl || null }),
        ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl || null }),
        ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle }),
        ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedBy: userId,
      },
      include: { _count: { select: { posts: true } } },
    })
    return author as BlogAuthorAdmin
  }

  /**
   * Delete author (soft delete). Optionally reassign posts to another author.
   */
  static async deleteAuthor(
    id: string,
    userId: string,
    reassignToAuthorId?: string | null
  ): Promise<void> {
    const existing = await prisma.blogAuthor.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundError('Author not found')
    if (reassignToAuthorId && reassignToAuthorId !== id) {
      await prisma.blogPost.updateMany({
        where: { authorId: id },
        data: { authorId: reassignToAuthorId, updatedBy: userId },
      })
    } else {
      const postCount = await prisma.blogPost.count({ where: { authorId: id, deletedAt: null } })
      if (postCount > 0) {
        throw new ValidationError(
          'Cannot delete author with posts. Reassign posts to another author first.',
          { reassignTo: ['Required when author has posts'] }
        )
      }
    }
    await prisma.blogAuthor.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    })
  }

  /**
   * Log AI usage for blog endpoints.
   */
  static async logAiUsage(data: {
    endpoint: string
    userId?: string | null
    ip: string
    inputTokens: number
    outputTokens: number
    estimatedCostUsd: number
    durationMs: number
    success: boolean
    errorMessage?: string | null
  }): Promise<void> {
    await prisma.blogAiUsageLog.create({
      data: {
        endpoint: data.endpoint,
        userId: data.userId ?? null,
        ip: data.ip,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        estimatedCostUsd: data.estimatedCostUsd,
        durationMs: data.durationMs,
        success: data.success,
        errorMessage: data.errorMessage ?? null,
      },
    })
  }

  /**
   * Get AI usage stats for admin dashboard.
   */
  static async getAiUsageStats(days = 1): Promise<BlogAiUsageStats> {
    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const [totalCalls, totalCost, byEndpointRaw, topUsersRaw] = await Promise.all([
      prisma.blogAiUsageLog.count({ where: { createdAt: { gte: since } } }),
      prisma.blogAiUsageLog.aggregate({
        where: { createdAt: { gte: since } },
        _sum: { estimatedCostUsd: true },
      }),
      prisma.blogAiUsageLog.groupBy({
        by: ['endpoint'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
        _sum: { estimatedCostUsd: true },
      }),
      prisma.blogAiUsageLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since }, userId: { not: null } },
        _count: { id: true },
        _sum: { estimatedCostUsd: true },
      }),
    ])

    const topUsers = topUsersRaw
      .filter((r) => r.userId)
      .sort((a, b) => (b._count.id ?? 0) - (a._count.id ?? 0))
      .slice(0, 10)
      .map((r) => ({
        userId: r.userId!,
        calls: r._count.id ?? 0,
        cost: r._sum.estimatedCostUsd ?? 0,
      }))

    return {
      totalCallsToday: totalCalls,
      totalCostToday: totalCost._sum.estimatedCostUsd ?? 0,
      byEndpoint: byEndpointRaw.map((r) => ({
        endpoint: r.endpoint,
        calls: r._count.id ?? 0,
        cost: r._sum.estimatedCostUsd ?? 0,
      })),
      topUsers,
    }
  }

  /**
   * Get post by ID (admin, includes drafts).
   */
  static async getPostById(id: string): Promise<BlogPostPublic | null> {
    const post = await prisma.blogPost.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { id: true, nameAr: true, nameEn: true, slug: true, descriptionAr: true, descriptionEn: true, icon: true, sortOrder: true } },
        author: { select: { id: true, name: true, bioAr: true, bioEn: true, avatar: true, role: true } },
        tags: { include: { tag: { select: { id: true, nameAr: true, nameEn: true, slug: true } } } },
      },
    })
    if (!post) return null
    return { ...post, tags: post.tags.map((t) => t.tag) } as BlogPostPublic
  }

  /**
   * Get category by slug.
   */
  static async getCategoryBySlug(slug: string): Promise<{ id: string; nameAr: string; nameEn: string; slug: string; descriptionAr: string | null; descriptionEn: string | null } | null> {
    return prisma.blogCategory.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      select: { id: true, nameAr: true, nameEn: true, slug: true, descriptionAr: true, descriptionEn: true },
    })
  }

  /**
   * Get tag by slug.
   */
  static async getTagBySlug(slug: string): Promise<{ id: string; nameAr: string; nameEn: string; slug: string } | null> {
    return prisma.blogTag.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, nameAr: true, nameEn: true, slug: true },
    })
  }

  /**
   * Check if IP has already viewed this post (for dedup).
   */
  static async hasViewed(postId: string, ipHash: string): Promise<boolean> {
    const count = await prisma.blogView.count({ where: { postId, ipHash } })
    return count > 0
  }

  /**
   * Check if IP has already reacted to this post.
   */
  static async hasReacted(postId: string, ipHash: string): Promise<boolean> {
    const count = await prisma.blogReaction.count({ where: { postId, ipHash } })
    return count > 0
  }

  /**
   * Get blog analytics for admin dashboard.
   */
  static async getAnalytics(days = 30): Promise<{
    totalViews: number
    totalReactions: number
    helpfulYes: number
    helpfulNo: number
    topPosts: Array<{ id: string; titleEn: string; slug: string; views: number; helpfulYes: number; helpfulNo: number }>
    viewsByDay: Array<{ date: string; views: number; unique: number }>
    byCategory: Array<{ categoryId: string; categoryName: string; posts: number; views: number }>
  }> {
    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const [totalViews, totalReactions, helpfulYes, helpfulNo, topPostsRaw, viewsByDayRaw, byCategoryRaw] =
      await Promise.all([
        prisma.blogView.count({ where: { createdAt: { gte: since } } }),
        prisma.blogReaction.count({ where: { createdAt: { gte: since } } }),
        prisma.blogReaction.count({ where: { type: 'HELPFUL_YES', createdAt: { gte: since } } }),
        prisma.blogReaction.count({ where: { type: 'HELPFUL_NO', createdAt: { gte: since } } }),
        prisma.blogPost.findMany({
          where: { deletedAt: null, status: 'PUBLISHED' },
          select: { id: true, titleEn: true, slug: true, views: true },
          orderBy: { views: 'desc' },
          take: 10,
        }),
        prisma.$queryRaw<
          Array<{ date: string; views: bigint; unique: bigint }>
        >`
          SELECT (bv."createdAt")::date::text as date,
                 COUNT(*)::bigint as views,
                 COUNT(DISTINCT bv."ipHash")::bigint as unique
          FROM "BlogView" bv
          WHERE bv."createdAt" >= ${since}
          GROUP BY (bv."createdAt")::date
          ORDER BY date ASC
        `,
        prisma.blogPost.groupBy({
          by: ['categoryId'],
          where: { deletedAt: null, status: 'PUBLISHED' },
          _count: { id: true },
          _sum: { views: true },
        }),
      ])

    const categoryIds = [...new Set(byCategoryRaw.map((r) => r.categoryId))]
    const categories = await prisma.blogCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, nameEn: true },
    })
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c.nameEn]))

    const postIds = topPostsRaw.map((p) => p.id)
    const [yesByPost, noByPost] =
      postIds.length > 0
        ? await Promise.all([
            prisma.blogReaction.groupBy({
              by: ['postId'],
              where: { postId: { in: postIds }, type: 'HELPFUL_YES' },
              _count: { id: true },
            }),
            prisma.blogReaction.groupBy({
              by: ['postId'],
              where: { postId: { in: postIds }, type: 'HELPFUL_NO' },
              _count: { id: true },
            }),
          ])
        : [[], []]
    const yesMap = Object.fromEntries(yesByPost.map((r) => [r.postId, r._count.id]))
    const noMap = Object.fromEntries(noByPost.map((r) => [r.postId, r._count.id]))

    return {
      totalViews,
      totalReactions,
      helpfulYes,
      helpfulNo,
      topPosts: topPostsRaw.map((p) => ({
        id: p.id,
        titleEn: p.titleEn,
        slug: p.slug,
        views: p.views,
        helpfulYes: yesMap[p.id] ?? 0,
        helpfulNo: noMap[p.id] ?? 0,
      })),
      viewsByDay: viewsByDayRaw.map((r) => ({
        date: r.date,
        views: Number(r.views),
        unique: Number(r.unique),
      })),
      byCategory: byCategoryRaw.map((r) => ({
        categoryId: r.categoryId,
        categoryName: catMap[r.categoryId] ?? 'Unknown',
        posts: r._count.id,
        views: r._sum.views ?? 0,
      })),
    }
  }
}
