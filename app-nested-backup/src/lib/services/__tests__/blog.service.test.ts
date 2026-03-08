/**
 * ═══════════════════════════════════════════
 * SERVICE: blog.service
 * ═══════════════════════════════════════════
 * METHODS: getPostsForAdmin, getPosts, getPostBySlug, getFeaturedPosts, getCategories, getTags, getAuthors, ...
 * DEPENDENCIES: prisma (blogPost, blogCategory, blogTag, blogAuthor, ...)
 * ═══════════════════════════════════════════
 */

import { BlogService } from '../blog.service'
import { prisma } from '@/lib/db/prisma'
import { BlogPostStatus } from '@prisma/client'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    blogPost: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), groupBy: jest.fn() },
    blogCategory: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    blogTag: { findMany: jest.fn(), findFirst: jest.fn() },
    blogAuthor: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    blogPostTag: { deleteMany: jest.fn() },
    blogView: { count: jest.fn(), create: jest.fn(), groupBy: jest.fn() },
    blogReaction: { count: jest.fn(), upsert: jest.fn(), groupBy: jest.fn() },
    blogRevision: { create: jest.fn(), findMany: jest.fn() },
    blogAiUsageLog: { create: jest.fn(), count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
    $transaction: jest.fn((ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : (ops as () => Promise<unknown>)())),
    $queryRaw: jest.fn().mockResolvedValue([]),
  },
}))

const mockPostFindMany = prisma.blogPost.findMany as jest.Mock
const mockPostFindFirst = prisma.blogPost.findFirst as jest.Mock
const mockPostCount = prisma.blogPost.count as jest.Mock
const mockPostCreate = prisma.blogPost.create as jest.Mock
const mockPostUpdate = prisma.blogPost.update as jest.Mock
const mockPostUpdateMany = prisma.blogPost.updateMany as jest.Mock
const mockPostGroupBy = prisma.blogPost.groupBy as jest.Mock
const mockCategoryFindMany = prisma.blogCategory.findMany as jest.Mock
const mockCategoryFindFirst = prisma.blogCategory.findFirst as jest.Mock
const mockCategoryCreate = prisma.blogCategory.create as jest.Mock
const mockCategoryUpdate = prisma.blogCategory.update as jest.Mock
const mockCategoryCount = prisma.blogCategory.count as jest.Mock
const mockTagFindMany = prisma.blogTag.findMany as jest.Mock
const mockTagFindFirst = prisma.blogTag.findFirst as jest.Mock
const mockAuthorFindMany = prisma.blogAuthor.findMany as jest.Mock
const mockAuthorFindFirst = prisma.blogAuthor.findFirst as jest.Mock
const mockAuthorCreate = prisma.blogAuthor.create as jest.Mock
const mockAuthorUpdate = prisma.blogAuthor.update as jest.Mock
const mockAuthorCount = prisma.blogAuthor.count as jest.Mock
const mockPostTagDeleteMany = prisma.blogPostTag.deleteMany as jest.Mock
const mockViewCount = prisma.blogView.count as jest.Mock
const mockViewCreate = prisma.blogView.create as jest.Mock
const mockReactionCount = prisma.blogReaction.count as jest.Mock
const mockReactionUpsert = prisma.blogReaction.upsert as jest.Mock
const mockReactionGroupBy = prisma.blogReaction.groupBy as jest.Mock
const mockRevisionCreate = prisma.blogRevision.create as jest.Mock
const mockRevisionFindMany = prisma.blogRevision.findMany as jest.Mock
const mockAiUsageCreate = prisma.blogAiUsageLog.create as jest.Mock
const mockAiUsageCount = prisma.blogAiUsageLog.count as jest.Mock
const mockAiUsageAggregate = prisma.blogAiUsageLog.aggregate as jest.Mock
const mockAiUsageGroupBy = prisma.blogAiUsageLog.groupBy as jest.Mock
const mockQueryRaw = prisma.$queryRaw as jest.Mock

const samplePost = {
  id: 'post-1',
  slug: 'test-post',
  titleEn: 'Test',
  titleAr: 'اختبار',
  excerptEn: 'Excerpt',
  excerptAr: 'مقتطف',
  coverImage: 'https://example.com/img.jpg',
  coverImageAltEn: null,
  coverImageAltAr: null,
  status: BlogPostStatus.PUBLISHED,
  publishedAt: new Date(),
  readingTime: 5,
  featured: false,
  trending: false,
  views: 10,
  createdAt: new Date(),
  category: { id: 'cat-1', nameAr: 'فئة', nameEn: 'Category', slug: 'cat', descriptionAr: null, descriptionEn: null, icon: null, sortOrder: 0 },
  author: { id: 'auth-1', name: 'Author', bioAr: null, bioEn: null, avatar: null, role: null },
  tags: [{ tag: { id: 'tag-1', nameAr: 'تاج', nameEn: 'Tag', slug: 'tag' } }],
}

describe('BlogService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPostFindMany.mockResolvedValue([])
    mockPostFindFirst.mockResolvedValue(null)
    mockPostCount.mockResolvedValue(0)
    mockCategoryFindMany.mockResolvedValue([])
    mockCategoryFindFirst.mockResolvedValue(null)
    mockCategoryCount.mockResolvedValue(0)
    mockTagFindMany.mockResolvedValue([])
    mockTagFindFirst.mockResolvedValue(null)
    mockAuthorFindMany.mockResolvedValue([])
    mockAuthorFindFirst.mockResolvedValue(null)
    mockAuthorCount.mockResolvedValue(0)
    mockViewCount.mockResolvedValue(0)
    mockReactionCount.mockResolvedValue(0)
    mockAiUsageCount.mockResolvedValue(0)
    mockAiUsageAggregate.mockResolvedValue({ _sum: { estimatedCostUsd: 0 } })
    mockAiUsageGroupBy.mockResolvedValue([])
    mockPostGroupBy.mockResolvedValue([])
    mockReactionGroupBy.mockResolvedValue([])
    mockQueryRaw.mockResolvedValue([])
  })

  describe('getPostsForAdmin', () => {
    it('returns posts, total, page, limit, totalPages', async () => {
      const result = await BlogService.getPostsForAdmin({ page: 1, limit: 20 })
      expect(result).toMatchObject({
        posts: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      })
    })

    it('applies category filter when categorySlug provided', async () => {
      await BlogService.getPostsForAdmin({ category: 'cameras' })
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: { slug: 'cameras', deletedAt: null } }),
        })
      )
    })

    it('applies tags filter', async () => {
      await BlogService.getPostsForAdmin({ tags: ['tag1', 'tag2'] })
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { some: { tag: { slug: { in: ['tag1', 'tag2'] }, deletedAt: null } } },
          }),
        })
      )
    })

    it('applies search query with OR on title and excerpt', async () => {
      await BlogService.getPostsForAdmin({ q: 'camera' })
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ titleEn: expect.objectContaining({ contains: 'camera' }) }),
              expect.objectContaining({ excerptEn: expect.objectContaining({ contains: 'camera' }) }),
            ]),
          }),
        })
      )
    })

    it('applies both tags filter and search query', async () => {
      await BlogService.getPostsForAdmin({ q: 'test', tags: ['cinema'] })
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { some: { tag: { slug: { in: ['cinema'] }, deletedAt: null } } },
            OR: expect.any(Array),
          }),
        })
      )
    })

    it('uses popular sort', async () => {
      await BlogService.getPostsForAdmin({ sort: 'popular' })
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
        })
      )
    })

    it('uses relevant sort when q provided', async () => {
      await BlogService.getPostsForAdmin({ sort: 'relevant', q: 'camera' })
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
        })
      )
    })
  })

  describe('searchPosts', () => {
    it('delegates to getPosts', async () => {
      const result = await BlogService.searchPosts({ page: 1, limit: 10 })
      expect(result).toMatchObject({ page: 1, limit: 10 })
      expect(mockPostFindMany).toHaveBeenCalled()
    })
  })

  describe('getPosts', () => {
    it('returns public posts with published filter', async () => {
      const result = await BlogService.getPosts({})
      expect(result.posts).toEqual([])
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED' }),
        })
      )
    })

    it('applies search query with OR when q provided', async () => {
      await BlogService.getPosts({ q: 'camera' })
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ titleEn: expect.objectContaining({ contains: 'camera' }) }),
            ]),
          }),
        })
      )
    })

    it('uses popular sort orderBy', async () => {
      await BlogService.getPosts({ sort: 'popular' })
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
        })
      )
    })

    it('uses relevant sort when q provided', async () => {
      await BlogService.getPosts({ sort: 'relevant', q: 'lens' })
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
        })
      )
    })

    it('uses newest sort by default', async () => {
      await BlogService.getPosts({})
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { publishedAt: 'desc' },
        })
      )
    })

    it('applies category filter only', async () => {
      await BlogService.getPosts({ category: 'cameras' })
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: { slug: 'cameras', deletedAt: null } }),
        })
      )
    })

    it('applies tags filter only', async () => {
      await BlogService.getPosts({ tags: ['cinema'] })
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { some: { tag: { slug: { in: ['cinema'] }, deletedAt: null } } },
          }),
        })
      )
    })

    it('skips tags when tags array empty', async () => {
      await BlogService.getPosts({ tags: [] })
      const call = mockPostFindMany.mock.calls[0][0]
      expect(call.where).not.toHaveProperty('tags')
    })
  })

  describe('getPostBySlug', () => {
    it('returns null when post not found', async () => {
      mockPostFindFirst.mockResolvedValue(null)
      const result = await BlogService.getPostBySlug('missing')
      expect(result).toBeNull()
    })

    it('returns post when found', async () => {
      mockPostFindFirst.mockResolvedValue({ ...samplePost, tags: [{ tag: { id: 't1', nameAr: 'x', nameEn: 'x', slug: 'x' } }] })
      const result = await BlogService.getPostBySlug('test-post')
      expect(result).not.toBeNull()
      expect(result?.slug).toBe('test-post')
    })

    it('allows draft with allowDraft option', async () => {
      mockPostFindFirst.mockResolvedValue({ ...samplePost, status: BlogPostStatus.DRAFT, tags: [] })
      const result = await BlogService.getPostBySlug('draft', { allowDraft: true })
      expect(result).not.toBeNull()
    })

    it('allows draft with valid previewToken', async () => {
      const orig = process.env.BLOG_PREVIEW_TOKEN
      process.env.BLOG_PREVIEW_TOKEN = 'secret'
      mockPostFindFirst.mockResolvedValue({ ...samplePost, status: BlogPostStatus.DRAFT, tags: [] })
      const result = await BlogService.getPostBySlug('draft', { previewToken: 'secret' })
      expect(result).not.toBeNull()
      process.env.BLOG_PREVIEW_TOKEN = orig
    })

    it('filters by published status when no allowDraft or previewToken', async () => {
      mockPostFindFirst.mockResolvedValue(null)
      await BlogService.getPostBySlug('published-only')
      expect(mockPostFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: BlogPostStatus.PUBLISHED,
            OR: expect.any(Array),
          }),
        })
      )
    })
  })

  describe('getCategories', () => {
    it('returns categories from findMany', async () => {
      mockCategoryFindMany.mockResolvedValue([
        { id: 'cat_1', nameAr: 'كاميرات', nameEn: 'Cameras', slug: 'cameras', sortOrder: 1 },
      ])
      const result = await BlogService.getCategories()
      expect(result).toHaveLength(1)
      expect(result[0].slug).toBe('cameras')
    })
  })

  describe('getTags', () => {
    it('returns tags from findMany', async () => {
      mockTagFindMany.mockResolvedValue([{ id: 'tag_1', nameAr: 'تاج', nameEn: 'Tag', slug: 'tag' }])
      const result = await BlogService.getTags()
      expect(result).toHaveLength(1)
    })
  })

  describe('getAuthors', () => {
    it('returns authors from findMany', async () => {
      mockAuthorFindMany.mockResolvedValue([])
      const result = await BlogService.getAuthors()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getFeaturedPosts', () => {
    it('returns featured posts limited by count', async () => {
      const result = await BlogService.getFeaturedPosts(3)
      expect(Array.isArray(result)).toBe(true)
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3, where: expect.objectContaining({ featured: true }) })
      )
    })

    it('uses default limit of 3', async () => {
      await BlogService.getFeaturedPosts()
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 })
      )
    })
  })

  describe('getPostsByCategory', () => {
    it('delegates to getPosts with category', async () => {
      const result = await BlogService.getPostsByCategory('cameras', 1, 12)
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: { slug: 'cameras', deletedAt: null } }),
        })
      )
      expect(result).toMatchObject({ page: 1, limit: 12 })
    })

    it('uses default page and limit', async () => {
      const result = await BlogService.getPostsByCategory('cameras')
      expect(result).toMatchObject({ page: 1, limit: 12 })
    })
  })

  describe('getPostsByTag', () => {
    it('delegates to getPosts with tags', async () => {
      await BlogService.getPostsByTag('cinema')
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { some: { tag: { slug: { in: ['cinema'] }, deletedAt: null } } },
          }),
        })
      )
    })

    it('uses default page and limit', async () => {
      const result = await BlogService.getPostsByTag('cinema')
      expect(result).toMatchObject({ page: 1, limit: 12 })
    })
  })

  describe('getRelatedPosts', () => {
    it('returns posts in same category', async () => {
      mockPostFindMany.mockResolvedValue([samplePost])
      const result = await BlogService.getRelatedPosts('post-1', 'cat-1', 3)
      expect(result).toHaveLength(1)
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { not: 'post-1' }, categoryId: 'cat-1' }),
          take: 3,
        })
      )
    })

    it('uses default limit of 3', async () => {
      mockPostFindMany.mockResolvedValue([])
      const result = await BlogService.getRelatedPosts('post-1', 'cat-1')
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 })
      )
    })

    it('returns empty array when no related posts', async () => {
      mockPostFindMany.mockResolvedValue([])
      const result = await BlogService.getRelatedPosts('post-1', 'cat-1', 5)
      expect(result).toEqual([])
    })
  })

  describe('getTrendingPosts', () => {
    it('returns fallback when no views in period', async () => {
      const mockViewGroupBy = prisma.blogView.groupBy as jest.Mock
      mockViewGroupBy.mockResolvedValue([])
      mockPostFindMany.mockResolvedValue([samplePost])
      const result = await BlogService.getTrendingPosts(5)
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(1)
    })

    it('returns ordered posts when views exist', async () => {
      const mockViewGroupBy = prisma.blogView.groupBy as jest.Mock
      mockViewGroupBy.mockResolvedValue([{ postId: 'post-1' }, { postId: 'post-2' }])
      mockPostFindMany.mockResolvedValue([
        { ...samplePost, id: 'post-1' },
        { ...samplePost, id: 'post-2' },
      ])
      const result = await BlogService.getTrendingPosts(5)
      expect(result).toHaveLength(2)
    })

    it('slices to limit when more postIds than limit', async () => {
      const mockViewGroupBy = prisma.blogView.groupBy as jest.Mock
      mockViewGroupBy.mockResolvedValue([
        { postId: 'p1' },
        { postId: 'p2' },
        { postId: 'p3' },
        { postId: 'p4' },
      ])
      mockPostFindMany.mockResolvedValue([
        { ...samplePost, id: 'p1' },
        { ...samplePost, id: 'p2' },
        { ...samplePost, id: 'p3' },
        { ...samplePost, id: 'p4' },
      ])
      const result = await BlogService.getTrendingPosts(2)
      expect(result).toHaveLength(2)
    })

    it('fetches posts by ids when groupBy returns postIds', async () => {
      const mockViewGroupBy = prisma.blogView.groupBy as jest.Mock
      mockViewGroupBy.mockResolvedValue([{ postId: 'p1' }, { postId: 'p2' }])
      mockPostFindMany.mockResolvedValue([
        { ...samplePost, id: 'p1' },
        { ...samplePost, id: 'p2' },
      ])
      const result = await BlogService.getTrendingPosts(3)
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ['p1', 'p2'] } }),
        })
      )
      expect(result).toHaveLength(2)
    })

    it('uses default limit of 5 when no arg', async () => {
      const mockViewGroupBy = prisma.blogView.groupBy as jest.Mock
      mockViewGroupBy.mockResolvedValue([])
      mockPostFindMany.mockResolvedValue([])
      await BlogService.getTrendingPosts()
      expect(mockViewGroupBy).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      )
    })
  })

  describe('getPostsForFeed', () => {
    it('returns minimal post fields', async () => {
      mockPostFindMany.mockResolvedValue([])
      const result = await BlogService.getPostsForFeed(50)
      expect(Array.isArray(result)).toBe(true)
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, where: expect.any(Object) })
      )
    })

    it('uses default limit of 100 when no arg', async () => {
      mockPostFindMany.mockResolvedValue([])
      await BlogService.getPostsForFeed()
      expect(mockPostFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      )
    })
  })

  describe('createPost', () => {
    it('creates post with tagIds', async () => {
      mockPostCreate.mockResolvedValue({
        ...samplePost,
        tags: [{ tag: { id: 't1', nameAr: 'x', nameEn: 'x', slug: 'x' } }],
      })
      const result = await BlogService.createPost(
        {
          titleEn: 'Title',
          titleAr: 'عنوان',
          excerptEn: 'Excerpt',
          excerptAr: 'مقتطف',
          slug: 'slug',
          coverImage: 'https://example.com/img.jpg',
          status: BlogPostStatus.PUBLISHED,
          categoryId: 'cat-1',
          authorId: 'auth-1',
          tagIds: ['tag-1'],
          content: {},
          featured: false,
          relatedEquipmentIds: [],
          trending: false,
        },
        'user-1'
      )
      expect(result).toBeDefined()
      expect(mockPostCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: { create: [{ tagId: 'tag-1' }] },
          }),
        })
      )
    })

    it('creates post without tagIds', async () => {
      mockPostCreate.mockResolvedValue({ ...samplePost, tags: [] })
      const result = await BlogService.createPost(
        {
          titleEn: 'Title',
          titleAr: 'عنوان',
          excerptEn: 'Excerpt',
          excerptAr: 'مقتطف',
          slug: 'slug',
          coverImage: 'https://example.com/img.jpg',
          status: BlogPostStatus.PUBLISHED,
          categoryId: 'cat-1',
          authorId: 'auth-1',
          tagIds: [],
          content: {},
          featured: false,
          relatedEquipmentIds: [],
          trending: false,
        },
        'user-1'
      )
      expect(result).toBeDefined()
      expect(mockPostCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ tags: expect.anything() }),
        })
      )
    })

    it('handles post when tags is not array', async () => {
      mockPostCreate.mockResolvedValue({ ...samplePost, tags: null })
      const result = await BlogService.createPost(
        {
          titleEn: 'Title',
          titleAr: 'عنوان',
          excerptEn: 'Excerpt',
          excerptAr: 'مقتطف',
          slug: 'slug',
          coverImage: 'https://example.com/img.jpg',
          status: BlogPostStatus.PUBLISHED,
          categoryId: 'cat-1',
          authorId: 'auth-1',
          tagIds: [],
          content: {},
          featured: false,
          relatedEquipmentIds: [],
          trending: false,
        },
        'user-1'
      )
      expect(result.tags).toEqual([])
    })
  })

  describe('updatePost', () => {
    it('throws NotFoundError when post not found', async () => {
      mockPostFindFirst.mockResolvedValue(null)
      await expect(
        BlogService.updatePost('missing', { titleEn: 'New' }, 'user-1')
      ).rejects.toThrow('Blog post')
    })

    it('updates post and creates revision when content changes', async () => {
      mockPostFindFirst.mockResolvedValueOnce({ content: { old: true } })
      mockPostTagDeleteMany.mockResolvedValue({})
      mockPostUpdate.mockResolvedValue({
        ...samplePost,
        tags: [],
      })
      mockRevisionCreate.mockResolvedValue({})
      const result = await BlogService.updatePost(
        'post-1',
        { titleEn: 'New', content: { new: true } },
        'user-1'
      )
      expect(result).toBeDefined()
      expect(mockRevisionCreate).toHaveBeenCalled()
    })

    it('deletes tags and creates new when tagIds provided', async () => {
      mockPostFindFirst.mockResolvedValueOnce({ content: {} })
      mockPostTagDeleteMany.mockResolvedValue({})
      mockPostUpdate.mockResolvedValue({
        ...samplePost,
        tags: [{ tag: { id: 't1', nameAr: 'x', nameEn: 'x', slug: 'x' } }],
      })
      await BlogService.updatePost('post-1', { tagIds: ['t1', 't2'] }, 'user-1')
      expect(mockPostTagDeleteMany).toHaveBeenCalledWith({ where: { postId: 'post-1' } })
      expect(mockPostUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: { create: [{ tagId: 't1' }, { tagId: 't2' }] },
          }),
        })
      )
    })

    it('deletes tags but does not create when tagIds empty array', async () => {
      mockPostFindFirst.mockResolvedValueOnce({ content: {} })
      mockPostTagDeleteMany.mockResolvedValue({})
      mockPostUpdate.mockResolvedValue({ ...samplePost, tags: [] })
      await BlogService.updatePost('post-1', { tagIds: [] }, 'user-1')
      expect(mockPostTagDeleteMany).toHaveBeenCalledWith({ where: { postId: 'post-1' } })
      const updateCall = mockPostUpdate.mock.calls[0]
      expect(updateCall[0].data).not.toHaveProperty('tags')
    })

    it('does not create revision when content unchanged', async () => {
      mockPostFindFirst.mockResolvedValueOnce({ content: { same: true } })
      mockPostUpdate.mockResolvedValue({ ...samplePost, tags: [] })
      await BlogService.updatePost('post-1', { titleEn: 'New', content: { same: true } }, 'user-1')
      expect(mockRevisionCreate).not.toHaveBeenCalled()
    })
  })

  describe('publishScheduledPosts', () => {
    it('returns count of published posts', async () => {
      mockPostUpdateMany.mockResolvedValue({ count: 3 })
      const result = await BlogService.publishScheduledPosts()
      expect(result).toBe(3)
    })
  })

  describe('getRevisions', () => {
    it('returns revision history', async () => {
      mockRevisionFindMany.mockResolvedValue([
        { id: 'rev-1', content: {}, editedBy: 'user-1', createdAt: new Date() },
      ])
      const result = await BlogService.getRevisions('post-1')
      expect(result).toHaveLength(1)
    })
  })

  describe('deletePost', () => {
    it('throws NotFoundError when post not found', async () => {
      mockPostFindFirst.mockResolvedValue(null)
      await expect(BlogService.deletePost('missing', 'user-1')).rejects.toThrow('Blog post')
    })

    it('soft deletes post', async () => {
      mockPostFindFirst.mockResolvedValue({ id: 'post-1' })
      mockPostUpdate.mockResolvedValue({})
      await BlogService.deletePost('post-1', 'user-1')
      expect(mockPostUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date), deletedBy: 'user-1' }),
        })
      )
    })
  })

  describe('incrementViews', () => {
    it('creates view and increments count', async () => {
      mockViewCreate.mockResolvedValue({})
      mockPostUpdate.mockResolvedValue({})
      await BlogService.incrementViews('post-1', 'ip-hash', 'ua', 'ref')
      expect(mockViewCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ postId: 'post-1', ipHash: 'ip-hash' }),
        })
      )
    })
  })

  describe('addReaction', () => {
    it('upserts reaction and returns counts', async () => {
      mockReactionUpsert.mockResolvedValue({})
      mockReactionCount.mockResolvedValueOnce(5).mockResolvedValueOnce(2)
      const result = await BlogService.addReaction('post-1', 'HELPFUL_YES', 'ip-hash')
      expect(result).toMatchObject({ helpfulYes: 5, helpfulNo: 2 })
    })
  })

  describe('getReactionCounts', () => {
    it('returns helpfulYes and helpfulNo', async () => {
      mockReactionCount.mockResolvedValueOnce(10).mockResolvedValueOnce(3)
      const result = await BlogService.getReactionCounts('post-1')
      expect(result).toMatchObject({ helpfulYes: 10, helpfulNo: 3 })
    })
  })

  describe('getCategoriesForAdmin', () => {
    it('returns categories without search filter when search empty', async () => {
      mockCategoryFindMany.mockResolvedValue([])
      mockCategoryCount.mockResolvedValue(0)
      const result = await BlogService.getCategoriesForAdmin({ search: '', page: 1, pageSize: 20 })
      expect(result.items).toEqual([])
      expect(mockCategoryFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
        })
      )
    })

    it('applies OR filter when search has content', async () => {
      mockCategoryFindMany.mockResolvedValue([])
      mockCategoryCount.mockResolvedValue(0)
      await BlogService.getCategoriesForAdmin({ search: '  cam  ', page: 1, pageSize: 20 })
      expect(mockCategoryFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ nameEn: expect.objectContaining({ contains: 'cam' }) }),
            ]),
          }),
        })
      )
    })

    it('returns paginated categories with search', async () => {
      mockCategoryFindMany.mockResolvedValue([
        { id: 'c1', nameAr: 'x', nameEn: 'Cameras', slug: 'cameras', parentCategoryId: null, _count: { posts: 5 }, descriptionAr: null, descriptionEn: null, icon: null, coverImage: null, metaTitle: null, metaDescription: null, sortOrder: 0, isActive: true, createdAt: new Date() },
      ])
      mockCategoryCount.mockResolvedValue(1)
      const result = await BlogService.getCategoriesForAdmin({ search: 'cam', page: 1, pageSize: 20 })
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('sets parent null when parent lookup returns empty', async () => {
      mockCategoryFindMany
        .mockResolvedValueOnce([
          { id: 'c1', nameAr: 'x', nameEn: 'Sub', slug: 'sub', parentCategoryId: 'missing-parent', _count: { posts: 1 }, descriptionAr: null, descriptionEn: null, icon: null, coverImage: null, metaTitle: null, metaDescription: null, sortOrder: 0, isActive: true, createdAt: new Date() },
        ])
        .mockResolvedValueOnce([])
      mockCategoryCount.mockResolvedValue(1)
      const result = await BlogService.getCategoriesForAdmin({ page: 1, pageSize: 20 })
      expect(result.items[0].parent).toBeNull()
    })

    it('includes parent when category has parentCategoryId', async () => {
      mockCategoryFindMany
        .mockResolvedValueOnce([
          { id: 'c1', nameAr: 'x', nameEn: 'Sub', slug: 'sub', parentCategoryId: 'p1', _count: { posts: 1 }, descriptionAr: null, descriptionEn: null, icon: null, coverImage: null, metaTitle: null, metaDescription: null, sortOrder: 0, isActive: true, createdAt: new Date() },
        ])
        .mockResolvedValueOnce([{ id: 'p1', nameAr: 'Parent', nameEn: 'Parent', slug: 'parent' }])
      mockCategoryCount.mockResolvedValue(1)
      const result = await BlogService.getCategoriesForAdmin({ page: 1, pageSize: 20 })
      expect(result.items[0].parent).toEqual({ id: 'p1', nameAr: 'Parent', nameEn: 'Parent', slug: 'parent' })
    })

    it('uses default search page pageSize when params empty', async () => {
      mockCategoryFindMany.mockResolvedValue([])
      mockCategoryCount.mockResolvedValue(0)
      const result = await BlogService.getCategoriesForAdmin({})
      expect(result.items).toEqual([])
      expect(mockCategoryFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          skip: 0,
          take: 20,
        })
      )
    })
  })

  describe('getCategoryById', () => {
    it('returns null when not found', async () => {
      mockCategoryFindFirst.mockResolvedValue(null)
      const result = await BlogService.getCategoryById('missing')
      expect(result).toBeNull()
    })

    it('returns category with null parent when no parentCategoryId', async () => {
      mockCategoryFindFirst.mockResolvedValue({
        id: 'c1',
        nameAr: 'x',
        nameEn: 'Root',
        slug: 'root',
        parentCategoryId: null,
        _count: { posts: 0 },
        descriptionAr: null,
        descriptionEn: null,
        icon: null,
        coverImage: null,
        metaTitle: null,
        metaDescription: null,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
      })
      const result = await BlogService.getCategoryById('c1')
      expect(result?.parent).toBeNull()
      expect(mockCategoryFindFirst).toHaveBeenCalledTimes(1)
    })

    it('returns category with parent when parentCategoryId set', async () => {
      mockCategoryFindFirst
        .mockResolvedValueOnce({
          id: 'c1',
          nameAr: 'x',
          nameEn: 'Sub',
          slug: 'sub',
          parentCategoryId: 'p1',
          _count: { posts: 1 },
          descriptionAr: null,
          descriptionEn: null,
          icon: null,
          coverImage: null,
          metaTitle: null,
          metaDescription: null,
          sortOrder: 0,
          isActive: true,
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({ id: 'p1', nameAr: 'Parent', nameEn: 'Parent', slug: 'parent' })
      const result = await BlogService.getCategoryById('c1')
      expect(result).not.toBeNull()
      expect(result?.parent).toEqual({ id: 'p1', nameAr: 'Parent', nameEn: 'Parent', slug: 'parent' })
    })
  })

  describe('createCategory', () => {
    it('throws ValidationError when slug exists', async () => {
      mockCategoryFindFirst.mockResolvedValue({ id: 'existing' })
      await expect(
        BlogService.createCategory(
          { nameEn: 'Cameras', nameAr: 'كاميرات', slug: 'cameras', isActive: true, sortOrder: 0 },
          'user-1'
        )
      ).rejects.toThrow('A category with this slug already exists')
    })

    it('creates category', async () => {
      mockCategoryFindFirst.mockResolvedValue(null)
      mockCategoryCreate.mockResolvedValue({
        id: 'new-1',
        nameAr: 'كاميرات',
        nameEn: 'Cameras',
        slug: 'cameras',
        parentCategoryId: null,
        _count: { posts: 0 },
        descriptionAr: null,
        descriptionEn: null,
        icon: null,
        coverImage: null,
        metaTitle: null,
        metaDescription: null,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
      })
      const result = await BlogService.createCategory(
        { nameEn: 'Cameras', nameAr: 'كاميرات', slug: 'cameras', isActive: true, sortOrder: 0 },
        'user-1'
      )
      expect(result.slug).toBe('cameras')
    })

    it('creates category with parentCategoryId and fetches parent', async () => {
      mockCategoryFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'p1', nameAr: 'Parent', nameEn: 'Parent', slug: 'parent' })
      mockCategoryCreate.mockResolvedValue({
        id: 'new-1',
        nameAr: 'كاميرات',
        nameEn: 'Cameras',
        slug: 'cameras',
        parentCategoryId: 'p1',
        _count: { posts: 0 },
        descriptionAr: null,
        descriptionEn: null,
        icon: null,
        coverImage: null,
        metaTitle: null,
        metaDescription: null,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
      })
      const result = await BlogService.createCategory(
        { nameEn: 'Cameras', nameAr: 'كاميرات', slug: 'cameras', parentCategoryId: 'p1', isActive: true, sortOrder: 0 },
        'user-1'
      )
      expect(result.parent).toEqual({ id: 'p1', nameAr: 'Parent', nameEn: 'Parent', slug: 'parent' })
    })
  })

  describe('updateCategory', () => {
    it('throws NotFoundError when category not found', async () => {
      mockCategoryFindFirst.mockResolvedValue(null)
      await expect(
        BlogService.updateCategory('missing', { nameEn: 'New' }, 'user-1')
      ).rejects.toThrow('Category not found')
    })

    it('throws ValidationError when new slug is taken', async () => {
      mockCategoryFindFirst
        .mockResolvedValueOnce({ id: 'c1', slug: 'old' })
        .mockResolvedValueOnce({ id: 'other', slug: 'taken' })
      await expect(
        BlogService.updateCategory('c1', { slug: 'taken' }, 'user-1')
      ).rejects.toThrow('A category with this slug already exists')
    })

    it('updates category successfully', async () => {
      mockCategoryFindFirst
        .mockResolvedValueOnce({ id: 'c1', slug: 'old' })
        .mockResolvedValueOnce(null)
      mockCategoryUpdate.mockResolvedValue({
        id: 'c1',
        nameAr: 'جديد',
        nameEn: 'Updated',
        slug: 'updated',
        parentCategoryId: null,
        _count: { posts: 0 },
        descriptionAr: null,
        descriptionEn: null,
        icon: null,
        coverImage: null,
        metaTitle: null,
        metaDescription: null,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
      })
      const result = await BlogService.updateCategory('c1', { nameEn: 'Updated', slug: 'updated' }, 'user-1')
      expect(result.nameEn).toBe('Updated')
      expect(result.slug).toBe('updated')
    })

    it('updates category without slug in data', async () => {
      mockCategoryFindFirst.mockResolvedValue({ id: 'c1', slug: 'old' })
      mockCategoryUpdate.mockResolvedValue({
        id: 'c1',
        nameAr: 'جديد',
        nameEn: 'Updated',
        slug: 'old',
        parentCategoryId: null,
        _count: { posts: 0 },
        descriptionAr: null,
        descriptionEn: null,
        icon: null,
        coverImage: null,
        metaTitle: null,
        metaDescription: null,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
      })
      const result = await BlogService.updateCategory('c1', { nameAr: 'جديد', nameEn: 'Updated' }, 'user-1')
      expect(result.nameAr).toBe('جديد')
      expect(mockCategoryFindFirst).toHaveBeenCalledTimes(1)
    })

    it('updates category without changing slug', async () => {
      mockCategoryFindFirst.mockResolvedValueOnce({ id: 'c1', slug: 'old' })
      mockCategoryUpdate.mockResolvedValue({
        id: 'c1',
        nameAr: 'جديد',
        nameEn: 'Updated',
        slug: 'old',
        parentCategoryId: null,
        _count: { posts: 0 },
        descriptionAr: null,
        descriptionEn: null,
        icon: null,
        coverImage: null,
        metaTitle: null,
        metaDescription: null,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
      })
      const result = await BlogService.updateCategory('c1', { nameEn: 'Updated' }, 'user-1')
      expect(result.nameEn).toBe('Updated')
      expect(mockCategoryFindFirst).toHaveBeenCalledTimes(1)
    })

    it('updates category with coverImage empty string becomes null', async () => {
      mockCategoryFindFirst.mockResolvedValue({ id: 'c1', slug: 'old' })
      mockCategoryUpdate.mockResolvedValue({
        id: 'c1',
        nameAr: 'x',
        nameEn: 'Cameras',
        slug: 'old',
        parentCategoryId: null,
        _count: { posts: 0 },
        descriptionAr: null,
        descriptionEn: null,
        icon: null,
        coverImage: null,
        metaTitle: null,
        metaDescription: null,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
      })
      await BlogService.updateCategory('c1', { coverImage: '' }, 'user-1')
      expect(mockCategoryUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ coverImage: null }),
        })
      )
    })

    it('updates category with coverImage icon and optional fields', async () => {
      mockCategoryFindFirst.mockResolvedValue({ id: 'c1', slug: 'old' })
      mockCategoryUpdate.mockResolvedValue({
        id: 'c1',
        nameAr: 'x',
        nameEn: 'Cameras',
        slug: 'old',
        parentCategoryId: null,
        _count: { posts: 0 },
        descriptionAr: null,
        descriptionEn: null,
        icon: 'camera',
        coverImage: 'https://example.com/img.jpg',
        metaTitle: 'Meta',
        metaDescription: 'Desc',
        sortOrder: 1,
        isActive: false,
        createdAt: new Date(),
      })
      const result = await BlogService.updateCategory(
        'c1',
        { icon: 'camera', coverImage: 'https://example.com/img.jpg', metaTitle: 'Meta', metaDescription: 'Desc', sortOrder: 1, isActive: false },
        'user-1'
      )
      expect(result.icon).toBe('camera')
      expect(result.coverImage).toBe('https://example.com/img.jpg')
    })

    it('updates category with descriptionAr descriptionEn parentCategoryId', async () => {
      mockCategoryFindFirst.mockResolvedValue({ id: 'c1', slug: 'old' })
      mockCategoryUpdate.mockResolvedValue({
        id: 'c1',
        nameAr: 'x',
        nameEn: 'Cameras',
        slug: 'old',
        parentCategoryId: 'p1',
        _count: { posts: 0 },
        descriptionAr: 'وصف',
        descriptionEn: 'Description',
        icon: null,
        coverImage: null,
        metaTitle: null,
        metaDescription: null,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
      })
      const result = await BlogService.updateCategory(
        'c1',
        { descriptionAr: 'وصف', descriptionEn: 'Description', parentCategoryId: 'p1' },
        'user-1'
      )
      expect(result.descriptionAr).toBe('وصف')
      expect(result.descriptionEn).toBe('Description')
    })
  })

  describe('deleteCategory', () => {
    it('throws NotFoundError when category not found', async () => {
      mockCategoryFindFirst.mockResolvedValue(null)
      await expect(
        BlogService.deleteCategory('missing', 'user-1')
      ).rejects.toThrow('Category not found')
    })

    it('reassigns posts when reassignToCategoryId provided', async () => {
      mockCategoryFindFirst.mockResolvedValue({ id: 'cat-1' })
      mockPostUpdateMany.mockResolvedValue({ count: 5 })
      mockCategoryUpdate.mockResolvedValue({})
      await BlogService.deleteCategory('cat-1', 'user-1', 'cat-2')
      expect(mockPostUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { categoryId: 'cat-1' },
          data: expect.objectContaining({ categoryId: 'cat-2' }),
        })
      )
    })

    it('soft deletes when no posts and no reassign', async () => {
      mockCategoryFindFirst.mockResolvedValue({ id: 'cat-1' })
      mockPostCount.mockResolvedValue(0)
      mockCategoryUpdate.mockResolvedValue({})
      await BlogService.deleteCategory('cat-1', 'user-1')
      expect(mockCategoryUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cat-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date), deletedBy: 'user-1' }),
        })
      )
    })

    it('throws when category has posts and no reassign', async () => {
      mockCategoryFindFirst.mockResolvedValue({ id: 'cat-1' })
      mockPostCount.mockResolvedValue(3)
      await expect(BlogService.deleteCategory('cat-1', 'user-1')).rejects.toThrow(
        'Cannot delete category with posts'
      )
    })

    it('does not reassign when reassignToCategoryId equals id', async () => {
      mockCategoryFindFirst.mockResolvedValue({ id: 'cat-1' })
      mockPostCount.mockResolvedValue(0)
      mockCategoryUpdate.mockResolvedValue({})
      await BlogService.deleteCategory('cat-1', 'user-1', 'cat-1')
      expect(mockPostUpdateMany).not.toHaveBeenCalled()
    })
  })

  describe('getAuthorById', () => {
    it('returns author when found', async () => {
      mockAuthorFindFirst.mockResolvedValue({
        id: 'a1',
        name: 'Author',
        slug: 'author',
        _count: { posts: 0 },
      })
      const result = await BlogService.getAuthorById('a1')
      expect(result).not.toBeNull()
      expect(result?.name).toBe('Author')
    })

    it('returns null when not found', async () => {
      mockAuthorFindFirst.mockResolvedValue(null)
      const result = await BlogService.getAuthorById('missing')
      expect(result).toBeNull()
    })
  })

  describe('getAuthorsForAdmin', () => {
    it('returns authors without search when search empty', async () => {
      mockAuthorFindMany.mockResolvedValue([])
      mockAuthorCount.mockResolvedValue(0)
      const result = await BlogService.getAuthorsForAdmin({})
      expect(result.items).toEqual([])
      expect(mockAuthorFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
        })
      )
    })

    it('returns paginated authors with search', async () => {
      mockAuthorFindMany.mockResolvedValue([
        { id: 'a1', name: 'Author One', slug: 'author-one', _count: { posts: 5 } },
      ])
      mockAuthorCount.mockResolvedValue(1)
      const result = await BlogService.getAuthorsForAdmin({ search: 'author', page: 1, pageSize: 20 })
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.items[0].name).toBe('Author One')
    })

    it('applies OR filter when search has content', async () => {
      mockAuthorFindMany.mockResolvedValue([])
      mockAuthorCount.mockResolvedValue(0)
      await BlogService.getAuthorsForAdmin({ search: '  auth  ', page: 1, pageSize: 20 })
      expect(mockAuthorFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.objectContaining({ contains: 'auth' }) }),
            ]),
          }),
        })
      )
    })
  })

  describe('createAuthor', () => {
    it('throws ValidationError when slug exists', async () => {
      mockAuthorFindFirst.mockResolvedValue({ id: 'existing' })
      await expect(
        BlogService.createAuthor(
          { name: 'Author', slug: 'author', email: 'author@test.com', isActive: true },
          'user-1'
        )
      ).rejects.toThrow('An author with this slug already exists')
    })

    it('throws ValidationError when email exists', async () => {
      mockAuthorFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'existing' })
      await expect(
        BlogService.createAuthor(
          { name: 'Author', slug: 'author', email: 'taken@email.com', isActive: true },
          'user-1'
        )
      ).rejects.toThrow('An author with this email already exists')
    })

    it('creates author', async () => {
      mockAuthorFindFirst.mockResolvedValue(null)
      mockAuthorCreate.mockResolvedValue({
        id: 'auth-1',
        name: 'Author',
        slug: 'author',
        _count: { posts: 0 },
      })
      const result = await BlogService.createAuthor(
        { name: 'Author', slug: 'author', email: 'author@test.com', isActive: true },
        'user-1'
      )
      expect(result.name).toBe('Author')
    })

    it('creates author with whitespace slug uses slugify', async () => {
      mockAuthorFindFirst.mockResolvedValue(null)
      mockAuthorCreate.mockResolvedValue({
        id: 'auth-1',
        name: 'Jane Doe',
        slug: 'jane-doe',
        _count: { posts: 0 },
      })
      await BlogService.createAuthor(
        { name: 'Jane Doe', slug: '   ', email: 'jane@test.com', isActive: true },
        'user-1'
      )
      expect(mockAuthorCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'jane-doe',
          }),
        })
      )
    })

    it('creates author with slug undefined uses slugify', async () => {
      mockAuthorFindFirst.mockResolvedValue(null)
      mockAuthorCreate.mockResolvedValue({
        id: 'auth-1',
        name: 'No Slug',
        slug: 'no-slug',
        _count: { posts: 0 },
      })
      const result = await BlogService.createAuthor(
        { name: 'No Slug', email: 'n@x.com', isActive: true },
        'user-1'
      )
      expect(mockAuthorCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'no-slug',
          }),
        })
      )
    })

    it('creates author without slug uses slugify', async () => {
      mockAuthorFindFirst.mockResolvedValue(null)
      mockAuthorCreate.mockResolvedValue({
        id: 'auth-1',
        name: 'John Doe',
        slug: 'john-doe',
        _count: { posts: 0 },
      })
      const result = await BlogService.createAuthor(
        { name: 'John Doe', email: 'john@test.com', isActive: true },
        'user-1'
      )
      expect(mockAuthorCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'john-doe',
          }),
        })
      )
    })

    it('creates author with optional fields', async () => {
      mockAuthorFindFirst.mockResolvedValue(null)
      mockAuthorCreate.mockResolvedValue({
        id: 'auth-1',
        name: 'Author',
        slug: 'author',
        email: 'a@x.com',
        bioAr: 'سيرة',
        bioEn: 'Bio',
        avatar: '/av.jpg',
        role: 'WRITER',
        _count: { posts: 0 },
      })
      const result = await BlogService.createAuthor(
        {
          name: 'Author',
          slug: 'author',
          email: 'a@x.com',
          bioAr: 'سيرة',
          bioEn: 'Bio',
          avatar: 'https://example.com/av.jpg',
          role: 'WRITER',
          isActive: true,
        },
        'user-1'
      )
      expect(mockAuthorCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'a@x.com',
            bioAr: 'سيرة',
            bioEn: 'Bio',
            avatar: 'https://example.com/av.jpg',
            role: 'WRITER',
          }),
        })
      )
    })
  })

  describe('updateAuthor', () => {
    it('throws NotFoundError when author not found', async () => {
      mockAuthorFindFirst.mockResolvedValue(null)
      await expect(
        BlogService.updateAuthor('missing', { name: 'New' }, 'user-1')
      ).rejects.toThrow('Author not found')
    })

    it('throws ValidationError when new slug is taken', async () => {
      mockAuthorFindFirst
        .mockResolvedValueOnce({ id: 'a1', slug: 'old', email: 'old@x.com' })
        .mockResolvedValueOnce({ id: 'other', slug: 'taken' })
      await expect(
        BlogService.updateAuthor('a1', { slug: 'taken' }, 'user-1')
      ).rejects.toThrow('An author with this slug already exists')
    })

    it('throws ValidationError when new email is taken', async () => {
      mockAuthorFindFirst
        .mockResolvedValueOnce({ id: 'a1', slug: 'old', email: 'old@x.com' })
        .mockResolvedValueOnce({ id: 'other', email: 'new@x.com' })
      await expect(
        BlogService.updateAuthor('a1', { email: 'new@x.com' }, 'user-1')
      ).rejects.toThrow('An author with this email already exists')
    })

    it('enters slug check when slug different from existing', async () => {
      mockAuthorFindFirst
        .mockResolvedValueOnce({ id: 'a1', slug: 'old', email: 'old@x.com' })
        .mockResolvedValueOnce(null)
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'Author',
        slug: 'different',
        _count: { posts: 0 },
      })
      await BlogService.updateAuthor('a1', { slug: 'different' }, 'user-1')
      expect(mockAuthorFindFirst).toHaveBeenCalledTimes(2)
    })

    it('updates author with new slug in data', async () => {
      mockAuthorFindFirst
        .mockResolvedValueOnce({ id: 'a1', slug: 'old', email: 'old@x.com' })
        .mockResolvedValueOnce(null)
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'Author',
        slug: 'new-slug',
        _count: { posts: 0 },
      })
      const result = await BlogService.updateAuthor('a1', { slug: 'new-slug' }, 'user-1')
      expect(mockAuthorUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'new-slug',
          }),
        })
      )
    })

    it('updates author successfully', async () => {
      mockAuthorFindFirst.mockResolvedValue({ id: 'a1', slug: 'old', email: 'old@x.com' })
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'Updated Author',
        slug: 'updated-author',
        _count: { posts: 2 },
      })
      const result = await BlogService.updateAuthor('a1', { name: 'Updated Author' }, 'user-1')
      expect(result.name).toBe('Updated Author')
    })

    it('updates author with email null', async () => {
      mockAuthorFindFirst
        .mockResolvedValueOnce({ id: 'a1', slug: 'old', email: 'old@x.com' })
        .mockResolvedValueOnce(null)
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'Old',
        slug: 'old',
        email: null,
        _count: { posts: 0 },
      })
      await BlogService.updateAuthor('a1', { email: '' }, 'user-1')
      expect(mockAuthorUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: null }),
        })
      )
    })

    it('updates author with email explicitly null uses empty string for uniqueness check', async () => {
      mockAuthorFindFirst
        .mockResolvedValueOnce({ id: 'a1', slug: 'old', email: 'old@x.com' })
        .mockResolvedValueOnce(null)
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'Old',
        slug: 'old',
        email: null,
        _count: { posts: 0 },
      })
      await BlogService.updateAuthor('a1', { email: null as unknown as string }, 'user-1')
      expect(mockAuthorFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ email: '' }),
        })
      )
    })

    it('updates author with empty avatar and urls become null', async () => {
      mockAuthorFindFirst.mockResolvedValue({ id: 'a1', slug: 'old', email: 'old@x.com' })
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'Old',
        slug: 'old',
        avatar: null,
        twitterUrl: null,
        linkedinUrl: null,
        _count: { posts: 0 },
      })
      await BlogService.updateAuthor(
        'a1',
        { avatar: '', twitterUrl: '', linkedinUrl: '', instagramUrl: '', githubUrl: '', websiteUrl: '' },
        'user-1'
      )
      expect(mockAuthorUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            avatar: null,
            twitterUrl: null,
            linkedinUrl: null,
          }),
        })
      )
    })

    it('updates author with avatar and social urls', async () => {
      mockAuthorFindFirst.mockResolvedValue({ id: 'a1', slug: 'old', email: 'old@x.com', name: 'Old' })
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'Old',
        slug: 'old',
        avatar: '/avatar.jpg',
        twitterUrl: 'https://twitter.com/x',
        bioAr: 'bio',
        bioEn: 'bio',
        _count: { posts: 0 },
      })
      const result = await BlogService.updateAuthor(
        'a1',
        { avatar: '/avatar.jpg', twitterUrl: 'https://twitter.com/x', bioAr: 'bio', bioEn: 'bio' },
        'user-1'
      )
      expect(result.avatar).toBe('/avatar.jpg')
    })

    it('updates author with slug in data adds slug to update', async () => {
      mockAuthorFindFirst
        .mockResolvedValueOnce({ id: 'a1', slug: 'old', email: 'old@x.com', name: 'Old' })
        .mockResolvedValueOnce(null)
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'Old',
        slug: 'trimmed-slug',
        _count: { posts: 0 },
      })
      await BlogService.updateAuthor('a1', { slug: '  trimmed-slug  ' }, 'user-1')
      expect(mockAuthorUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'trimmed-slug',
          }),
        })
      )
    })

    it('updates author slug when empty uses slugify', async () => {
      mockAuthorFindFirst.mockResolvedValue({ id: 'a1', slug: 'old', email: 'old@x.com', name: 'Old Name' })
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'New Name',
        slug: 'new-name',
        _count: { posts: 0 },
      })
      await BlogService.updateAuthor('a1', { slug: '  ', name: 'New Name' }, 'user-1')
      expect(mockAuthorUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'new-name',
          }),
        })
      )
    })

    it('skips slug check when slug is empty string', async () => {
      mockAuthorFindFirst.mockResolvedValue({ id: 'a1', slug: 'old', email: 'old@x.com', name: 'Old' })
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'Updated',
        slug: 'old',
        _count: { posts: 0 },
      })
      await BlogService.updateAuthor('a1', { name: 'Updated', slug: '' }, 'user-1')
      expect(mockAuthorFindFirst).toHaveBeenCalledTimes(1)
    })

    it('updates author with slug empty uses slugify of existing name', async () => {
      mockAuthorFindFirst.mockResolvedValue({ id: 'a1', slug: 'old', email: 'old@x.com', name: 'Existing Name' })
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'Existing Name',
        slug: 'existing-name',
        _count: { posts: 0 },
      })
      await BlogService.updateAuthor('a1', { slug: '' }, 'user-1')
      expect(mockAuthorUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'existing-name',
          }),
        })
      )
    })

    it('updates author without slug in data does not add slug to update', async () => {
      mockAuthorFindFirst.mockResolvedValue({ id: 'a1', slug: 'old', email: 'old@x.com', name: 'Old' })
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'New Name',
        slug: 'old',
        _count: { posts: 0 },
      })
      await BlogService.updateAuthor('a1', { name: 'New Name' }, 'user-1')
      const updateData = mockAuthorUpdate.mock.calls[0][0].data
      expect(updateData).not.toHaveProperty('slug')
    })

    it('updates author without slug keeps existing slug', async () => {
      mockAuthorFindFirst.mockResolvedValue({ id: 'a1', slug: 'old', email: 'old@x.com', name: 'Old' })
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'New Name',
        slug: 'old',
        _count: { posts: 0 },
      })
      const result = await BlogService.updateAuthor('a1', { name: 'New Name' }, 'user-1')
      expect(mockAuthorFindFirst).toHaveBeenCalledTimes(1)
      expect(result.slug).toBe('old')
    })

    it('enters email check when email different from existing', async () => {
      mockAuthorFindFirst
        .mockResolvedValueOnce({ id: 'a1', slug: 'old', email: 'old@x.com' })
        .mockResolvedValueOnce(null)
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'Author',
        slug: 'old',
        email: 'new@x.com',
        _count: { posts: 0 },
      })
      await BlogService.updateAuthor('a1', { email: 'new@x.com' }, 'user-1')
      expect(mockAuthorFindFirst).toHaveBeenCalledTimes(2)
    })

    it('skips email check when email unchanged', async () => {
      mockAuthorFindFirst.mockResolvedValue({ id: 'a1', slug: 'old', email: 'same@x.com' })
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'New',
        slug: 'old',
        email: 'same@x.com',
        _count: { posts: 0 },
      })
      await BlogService.updateAuthor('a1', { name: 'New', email: 'same@x.com' }, 'user-1')
      expect(mockAuthorFindFirst).toHaveBeenCalledTimes(1)
    })

    it('updates author with role userId and social links', async () => {
      mockAuthorFindFirst.mockResolvedValue({ id: 'a1', slug: 'old', email: 'old@x.com', name: 'Old' })
      mockAuthorUpdate.mockResolvedValue({
        id: 'a1',
        name: 'Old',
        slug: 'old',
        role: 'EDITOR',
        userId: 'u1',
        linkedinUrl: 'https://linkedin.com',
        instagramUrl: 'https://instagram.com',
        githubUrl: 'https://github.com',
        websiteUrl: 'https://site.com',
        metaTitle: 'Meta',
        metaDescription: 'Desc',
        isActive: false,
        _count: { posts: 0 },
      })
      const result = await BlogService.updateAuthor(
        'a1',
        {
          role: 'EDITOR',
          userId: 'u1',
          linkedinUrl: 'https://linkedin.com',
          instagramUrl: 'https://instagram.com',
          githubUrl: 'https://github.com',
          websiteUrl: 'https://site.com',
          metaTitle: 'Meta',
          metaDescription: 'Desc',
          isActive: false,
        },
        'user-1'
      )
      expect(result.role).toBe('EDITOR')
      expect(result.isActive).toBe(false)
    })
  })

  describe('deleteAuthor', () => {
    it('throws NotFoundError when author not found', async () => {
      mockAuthorFindFirst.mockResolvedValue(null)
      await expect(
        BlogService.deleteAuthor('missing', 'user-1')
      ).rejects.toThrow('Author not found')
    })

    it('reassigns posts when reassignToAuthorId provided', async () => {
      mockAuthorFindFirst.mockResolvedValue({ id: 'a1' })
      mockPostUpdateMany.mockResolvedValue({ count: 3 })
      mockAuthorUpdate.mockResolvedValue({})
      await BlogService.deleteAuthor('a1', 'user-1', 'a2')
      expect(mockPostUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { authorId: 'a1' },
          data: expect.objectContaining({ authorId: 'a2' }),
        })
      )
    })

    it('throws when author has posts and no reassign', async () => {
      mockAuthorFindFirst.mockResolvedValue({ id: 'a1' })
      mockPostCount.mockResolvedValue(2)
      await expect(BlogService.deleteAuthor('a1', 'user-1')).rejects.toThrow(
        'Cannot delete author with posts'
      )
    })
  })

  describe('getPostById', () => {
    it('returns null when not found', async () => {
      mockPostFindFirst.mockResolvedValue(null)
      const result = await BlogService.getPostById('missing')
      expect(result).toBeNull()
    })

    it('returns post with tags when found', async () => {
      mockPostFindFirst.mockResolvedValue({
        ...samplePost,
        tags: [{ tag: { id: 't1', nameAr: 'x', nameEn: 'Tag', slug: 'tag' } }],
      })
      const result = await BlogService.getPostById('post-1')
      expect(result).not.toBeNull()
      expect(result?.tags).toHaveLength(1)
      expect(result?.tags[0].slug).toBe('tag')
    })
  })

  describe('getCategoryBySlug', () => {
    it('returns category by slug', async () => {
      mockCategoryFindFirst.mockResolvedValue({ id: 'c1', nameAr: 'x', nameEn: 'Cameras', slug: 'cameras', descriptionAr: null, descriptionEn: null })
      const result = await BlogService.getCategoryBySlug('cameras')
      expect(result?.slug).toBe('cameras')
    })
  })

  describe('getTagBySlug', () => {
    it('returns tag by slug', async () => {
      mockTagFindFirst.mockResolvedValue({ id: 't1', nameAr: 'x', nameEn: 'Tag', slug: 'tag' })
      const result = await BlogService.getTagBySlug('tag')
      expect(result?.slug).toBe('tag')
    })
  })

  describe('hasViewed', () => {
    it('returns true when count > 0', async () => {
      mockViewCount.mockResolvedValue(1)
      const result = await BlogService.hasViewed('post-1', 'ip-hash')
      expect(result).toBe(true)
    })

    it('returns false when count is 0', async () => {
      mockViewCount.mockResolvedValue(0)
      const result = await BlogService.hasViewed('post-1', 'ip-hash')
      expect(result).toBe(false)
    })
  })

  describe('hasReacted', () => {
    it('returns true when count > 0', async () => {
      mockReactionCount.mockResolvedValue(1)
      const result = await BlogService.hasReacted('post-1', 'ip-hash')
      expect(result).toBe(true)
    })

    it('returns false when count is 0', async () => {
      mockReactionCount.mockResolvedValue(0)
      const result = await BlogService.hasReacted('post-1', 'ip-hash')
      expect(result).toBe(false)
    })
  })

  describe('logAiUsage', () => {
    it('creates log entry', async () => {
      mockAiUsageCreate.mockResolvedValue({})
      await BlogService.logAiUsage({
        endpoint: 'test',
        ip: '1.2.3.4',
        inputTokens: 100,
        outputTokens: 50,
        estimatedCostUsd: 0.01,
        durationMs: 500,
        success: true,
      })
      expect(mockAiUsageCreate).toHaveBeenCalled()
    })
  })

  describe('getAnalytics', () => {
    it('uses default days of 30', async () => {
      mockViewCount.mockResolvedValue(0)
      mockReactionCount.mockResolvedValue(0)
      mockPostFindMany.mockResolvedValue([])
      mockQueryRaw.mockResolvedValue([])
      mockPostGroupBy.mockResolvedValue([])
      mockCategoryFindMany.mockResolvedValue([])
      const result = await BlogService.getAnalytics()
      expect(result.totalViews).toBe(0)
    })
    it('returns analytics with byCategory null views', async () => {
      mockViewCount.mockResolvedValue(0)
      mockReactionCount.mockResolvedValue(0)
      mockPostFindMany.mockResolvedValue([])
      mockQueryRaw.mockResolvedValue([])
      mockPostGroupBy.mockResolvedValue([
        { categoryId: 'c1', _count: { id: 2 }, _sum: { views: null } },
      ])
      mockCategoryFindMany.mockResolvedValue([{ id: 'c1', nameEn: 'Cameras' }])
      const result = await BlogService.getAnalytics(7)
      expect(result.byCategory).toEqual([
        { categoryId: 'c1', categoryName: 'Cameras', posts: 2, views: 0 },
      ])
    })

    it('returns analytics with byCategory Unknown fallback', async () => {
      mockViewCount.mockResolvedValue(0)
      mockReactionCount.mockResolvedValue(0)
      mockPostFindMany.mockResolvedValue([])
      mockQueryRaw.mockResolvedValue([])
      mockPostGroupBy.mockResolvedValue([
        { categoryId: 'orphan-cat', _count: { id: 1 }, _sum: { views: 10 } },
      ])
      mockCategoryFindMany.mockResolvedValue([])
      const result = await BlogService.getAnalytics(7)
      expect(result.byCategory).toEqual([
        { categoryId: 'orphan-cat', categoryName: 'Unknown', posts: 1, views: 10 },
      ])
    })

    it('returns analytics when no top posts', async () => {
      mockViewCount.mockResolvedValue(1)
      mockReactionCount.mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(0)
      mockPostFindMany.mockResolvedValue([])
      mockQueryRaw.mockResolvedValue([])
      mockPostGroupBy.mockResolvedValue([])
      mockCategoryFindMany.mockResolvedValue([])
      const result = await BlogService.getAnalytics(7)
      expect(result.topPosts).toEqual([])
      expect(result.totalViews).toBe(1)
    })

    it('returns analytics with topPost not in reaction maps', async () => {
      mockViewCount.mockResolvedValue(10)
      mockReactionCount.mockResolvedValueOnce(5).mockResolvedValueOnce(2).mockResolvedValueOnce(1)
      mockPostFindMany.mockResolvedValue([
        { id: 'p1', titleEn: 'Post 1', slug: 'post-1', views: 100 },
        { id: 'p2', titleEn: 'Post 2', slug: 'post-2', views: 50 },
      ])
      mockQueryRaw.mockResolvedValue([])
      mockPostGroupBy.mockResolvedValue([])
      mockCategoryFindMany.mockResolvedValue([])
      mockReactionGroupBy
        .mockResolvedValueOnce([{ postId: 'p1', _count: { id: 3 } }])
        .mockResolvedValueOnce([{ postId: 'p1', _count: { id: 1 } }])
      const result = await BlogService.getAnalytics(7)
      expect(result.topPosts).toContainEqual(
        expect.objectContaining({ id: 'p2', helpfulYes: 0, helpfulNo: 0 })
      )
    })

    it('returns analytics with views, reactions, topPosts, viewsByDay, byCategory', async () => {
      mockViewCount.mockResolvedValue(100)
      mockReactionCount
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(20)
      mockPostFindMany.mockResolvedValue([
        { id: 'p1', titleEn: 'Top Post', slug: 'top-post', views: 500 },
      ])
      mockQueryRaw.mockResolvedValue([
        { date: '2026-03-01', views: BigInt(50), unique: BigInt(25) },
      ])
      mockPostGroupBy.mockResolvedValue([
        { categoryId: 'c1', _count: { id: 3 }, _sum: { views: 200 } },
      ])
      mockCategoryFindMany.mockResolvedValue([{ id: 'c1', nameEn: 'Cameras' }])
      mockReactionGroupBy
        .mockResolvedValueOnce([{ postId: 'p1', _count: { id: 10 } }])
        .mockResolvedValueOnce([{ postId: 'p1', _count: { id: 5 } }])
      const result = await BlogService.getAnalytics(7)
      expect(result).toMatchObject({
        totalViews: 100,
        totalReactions: 50,
        helpfulYes: 30,
        helpfulNo: 20,
        topPosts: expect.arrayContaining([
          expect.objectContaining({
            id: 'p1',
            titleEn: 'Top Post',
            slug: 'top-post',
            views: 500,
            helpfulYes: 10,
            helpfulNo: 5,
          }),
        ]),
        viewsByDay: [{ date: '2026-03-01', views: 50, unique: 25 }],
        byCategory: [{ categoryId: 'c1', categoryName: 'Cameras', posts: 3, views: 200 }],
      })
    })
  })

  describe('getAiUsageStats', () => {
    it('uses default days of 1', async () => {
      mockAiUsageCount.mockResolvedValue(0)
      mockAiUsageAggregate.mockResolvedValue({ _sum: { estimatedCostUsd: 0 } })
      mockAiUsageGroupBy.mockResolvedValue([])
      const result = await BlogService.getAiUsageStats()
      expect(result.totalCallsToday).toBe(0)
    })
    it('returns stats with byEndpoint and topUsers', async () => {
      mockAiUsageCount.mockResolvedValue(10)
      mockAiUsageAggregate.mockResolvedValue({ _sum: { estimatedCostUsd: 0.5 } })
      mockAiUsageGroupBy
        .mockResolvedValueOnce([
          { endpoint: 'summarize', _count: { id: 5 }, _sum: { estimatedCostUsd: 0.2 } },
        ])
        .mockResolvedValueOnce([
          { userId: 'u1', _count: { id: 8 }, _sum: { estimatedCostUsd: 0.3 } },
          { userId: null, _count: { id: 2 }, _sum: { estimatedCostUsd: 0 } },
          { userId: 'u2', _count: { id: 3 }, _sum: { estimatedCostUsd: 0.1 } },
        ])
      const result = await BlogService.getAiUsageStats(7)
      expect(result.totalCallsToday).toBe(10)
      expect(result.totalCostToday).toBe(0.5)
      expect(result.byEndpoint).toEqual([{ endpoint: 'summarize', calls: 5, cost: 0.2 }])
      expect(result.topUsers).toEqual(
        expect.arrayContaining([
          { userId: 'u1', calls: 8, cost: 0.3 },
          { userId: 'u2', calls: 3, cost: 0.1 },
        ])
      )
      expect(result.topUsers).toHaveLength(2)
    })

    it('sorts topUsers by _count.id when both defined', async () => {
      mockAiUsageCount.mockResolvedValue(5)
      mockAiUsageAggregate.mockResolvedValue({ _sum: { estimatedCostUsd: 0.5 } })
      mockAiUsageGroupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { userId: 'u1', _count: { id: 10 }, _sum: { estimatedCostUsd: 0.3 } },
          { userId: 'u2', _count: { id: 5 }, _sum: { estimatedCostUsd: 0.2 } },
        ])
      const result = await BlogService.getAiUsageStats(7)
      expect(result.topUsers[0].userId).toBe('u1')
      expect(result.topUsers[0].calls).toBe(10)
      expect(result.topUsers[1].userId).toBe('u2')
      expect(result.topUsers[1].calls).toBe(5)
    })

    it('handles topUsers with null _count and _sum', async () => {
      mockAiUsageCount.mockResolvedValue(1)
      mockAiUsageAggregate.mockResolvedValue({ _sum: { estimatedCostUsd: 0 } })
      mockAiUsageGroupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { userId: 'u1', _count: { id: undefined }, _sum: { estimatedCostUsd: undefined } },
        ])
      const result = await BlogService.getAiUsageStats(1)
      expect(result.topUsers).toEqual([{ userId: 'u1', calls: 0, cost: 0 }])
    })

    it('handles byEndpoint with null _count and _sum', async () => {
      mockAiUsageCount.mockResolvedValue(1)
      mockAiUsageAggregate.mockResolvedValue({ _sum: { estimatedCostUsd: null } })
      mockAiUsageGroupBy
        .mockResolvedValueOnce([{ endpoint: 'x', _count: {}, _sum: {} }])
        .mockResolvedValueOnce([])
      const result = await BlogService.getAiUsageStats(1)
      expect(result.totalCostToday).toBe(0)
      expect(result.byEndpoint[0].calls).toBe(0)
      expect(result.byEndpoint[0].cost).toBe(0)
    })

    it('sorts topUsers when _count.id is null uses 0 for comparison', async () => {
      mockAiUsageCount.mockResolvedValue(3)
      mockAiUsageAggregate.mockResolvedValue({ _sum: { estimatedCostUsd: 0 } })
      mockAiUsageGroupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { userId: 'u1', _count: { id: 10 }, _sum: { estimatedCostUsd: 0.2 } },
          { userId: 'u2', _count: { id: null }, _sum: { estimatedCostUsd: null } },
          { userId: 'u3', _count: { id: 5 }, _sum: { estimatedCostUsd: 0.1 } },
        ])
      const result = await BlogService.getAiUsageStats(1)
      expect(result.topUsers).toHaveLength(3)
      expect(result.topUsers[0]).toMatchObject({ userId: 'u1', calls: 10 })
      expect(result.topUsers[1]).toMatchObject({ userId: 'u3', calls: 5 })
      expect(result.topUsers[2]).toMatchObject({ userId: 'u2', calls: 0, cost: 0 })
    })
  })
})
