/**
 * Unit tests for hero-banner.service
 */

import { HeroBannerService } from '../hero-banner.service'
import { prisma } from '@/lib/db/prisma'
import { cacheGet, cacheSet } from '@/lib/cache'

jest.mock('@/lib/db/prisma', () => {
  const heroSlide = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    aggregate: jest.fn(),
  }
  const mockPrisma = {
    heroBanner: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    heroSlide,
    $transaction: jest.fn((arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg as Promise<unknown>[]) : Promise.resolve()
    ),
  }
  return { prisma: mockPrisma }
})

jest.mock('@/lib/cache', () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDelete: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/services/audit.service', () => ({ AuditService: { log: jest.fn().mockResolvedValue(undefined) } }))

const mockBannerFindFirst = prisma.heroBanner.findFirst as jest.Mock
const mockBannerFindMany = prisma.heroBanner.findMany as jest.Mock
const mockBannerCreate = prisma.heroBanner.create as jest.Mock
const mockBannerUpdate = prisma.heroBanner.update as jest.Mock
const mockSlideCreate = prisma.heroSlide.create as jest.Mock
const mockSlideUpdate = prisma.heroSlide.update as jest.Mock
const mockSlideAggregate = prisma.heroSlide.aggregate as jest.Mock

const baseSlide = {
  id: 's1',
  imageUrl: 'https://example.com/img.jpg',
  mobileImageUrl: null,
  videoUrl: null,
  titleAr: 'عربي',
  titleEn: 'English',
  titleZh: null,
  subtitleAr: null,
  subtitleEn: null,
  subtitleZh: null,
  badgeTextAr: null,
  badgeTextEn: null,
  badgeTextZh: null,
  ctaTextAr: null,
  ctaTextEn: null,
  ctaTextZh: null,
  ctaUrl: null,
  ctaStyle: 'primary',
  cta2TextAr: null,
  cta2TextEn: null,
  cta2TextZh: null,
  cta2Url: null,
  cta2Style: null,
  order: 0,
  overlayOpacity: 0.3,
  textPosition: 'start',
}

describe('HeroBannerService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(cacheGet as jest.Mock).mockResolvedValue(null)
  })

  describe('getActiveBannerByPage', () => {
    it('returns cached result when cache hit', async () => {
      const cached = { id: 'b1', name: 'Cached', pageSlug: 'home', slides: [] }
      ;(cacheGet as jest.Mock).mockResolvedValue(cached)
      const result = await HeroBannerService.getActiveBannerByPage('home')
      expect(result).toEqual(cached)
      expect(mockBannerFindFirst).not.toHaveBeenCalled()
    })

    it('returns null when banner not found', async () => {
      mockBannerFindFirst.mockResolvedValue(null)
      const result = await HeroBannerService.getActiveBannerByPage('missing')
      expect(result).toBeNull()
    })

    it('returns null when banner has no slides', async () => {
      mockBannerFindFirst.mockResolvedValue({
        id: 'b1',
        name: 'Banner',
        pageSlug: 'home',
        autoPlay: true,
        autoPlayInterval: 6000,
        transitionType: 'fade',
        slides: [],
      })
      const result = await HeroBannerService.getActiveBannerByPage('home')
      expect(result).toBeNull()
    })

    it('returns banner with slides and caches result', async () => {
      mockBannerFindFirst.mockResolvedValue({
        id: 'b1',
        name: 'Banner',
        pageSlug: 'home',
        autoPlay: true,
        autoPlayInterval: 6000,
        transitionType: 'fade',
        slides: [{ ...baseSlide }],
      })
      const result = await HeroBannerService.getActiveBannerByPage('home')
      expect(result).toMatchObject({ id: 'b1', name: 'Banner', pageSlug: 'home' })
      expect(result!.slides).toHaveLength(1)
      expect(cacheSet).toHaveBeenCalled()
    })
  })

  describe('getAllBanners', () => {
    it('returns array from findMany', async () => {
      mockBannerFindMany.mockResolvedValue([])
      const result = await HeroBannerService.getAllBanners()
      expect(Array.isArray(result)).toBe(true)
    })

    it('returns banners with slide counts', async () => {
      mockBannerFindMany.mockResolvedValue([
        { id: 'b1', name: 'B1', pageSlug: 'home', isActive: true, autoPlay: true, autoPlayInterval: 6000, transitionType: 'fade', _count: { slides: 2 }, createdAt: new Date() },
      ])
      const result = await HeroBannerService.getAllBanners()
      expect(result).toHaveLength(1)
      expect(result[0].slideCount).toBe(2)
    })
  })

  describe('getBannerById', () => {
    it('throws NotFoundError when banner not found', async () => {
      mockBannerFindFirst.mockResolvedValue(null)
      await expect(HeroBannerService.getBannerById('missing')).rejects.toThrow('Hero banner')
    })

    it('returns banner with slides', async () => {
      mockBannerFindFirst.mockResolvedValue({
        id: 'b1',
        name: 'Banner',
        pageSlug: 'home',
        autoPlay: true,
        autoPlayInterval: 6000,
        transitionType: 'fade',
        slides: [{ ...baseSlide, isActive: true, publishAt: null, unpublishAt: null, createdAt: new Date(), updatedAt: new Date() }],
      })
      const result = await HeroBannerService.getBannerById('b1')
      expect(result.id).toBe('b1')
      expect(result.slides).toHaveLength(1)
    })
  })

  describe('createBanner', () => {
    it('throws ValidationError when pageSlug already exists', async () => {
      mockBannerFindFirst.mockResolvedValue({ id: 'existing', pageSlug: 'home' })
      await expect(
        HeroBannerService.createBanner({ name: 'New', pageSlug: 'home', isActive: true, autoPlay: true, autoPlayInterval: 6000, transitionType: 'fade' }, 'u1')
      ).rejects.toThrow('already exists')
    })

    it('creates banner and returns', async () => {
      mockBannerFindFirst.mockResolvedValue(null)
      mockBannerCreate.mockResolvedValue({
        id: 'b1',
        name: 'New',
        pageSlug: 'home',
        autoPlay: true,
        autoPlayInterval: 6000,
        transitionType: 'fade',
      })
      mockBannerFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'b1',
        name: 'New',
        pageSlug: 'home',
        autoPlay: true,
        autoPlayInterval: 6000,
        transitionType: 'fade',
        slides: [],
      })
      const result = await HeroBannerService.createBanner({ name: 'New', pageSlug: 'home', isActive: true, autoPlay: true, autoPlayInterval: 6000, transitionType: 'fade' }, 'u1')
      expect(result.id).toBe('b1')
      expect(mockBannerCreate).toHaveBeenCalled()
    })
  })

  describe('updateBanner', () => {
    it('throws NotFoundError when banner not found', async () => {
      mockBannerFindFirst.mockResolvedValue(null)
      await expect(
        HeroBannerService.updateBanner('missing', { name: 'Updated' }, 'u1')
      ).rejects.toThrow('Hero banner')
    })

    it('updates banner', async () => {
      mockBannerFindFirst
        .mockResolvedValueOnce({ id: 'b1', pageSlug: 'home' })
        .mockResolvedValueOnce({ id: 'b1', name: 'Updated', pageSlug: 'home', autoPlay: true, autoPlayInterval: 6000, transitionType: 'fade', slides: [] })
      mockBannerUpdate.mockResolvedValue({})
      const result = await HeroBannerService.updateBanner('b1', { name: 'Updated' }, 'u1')
      expect(result.name).toBe('Updated')
    })

    it('updates banner with isActive, autoPlay, autoPlayInterval, transitionType', async () => {
      mockBannerFindFirst
        .mockResolvedValueOnce({ id: 'b1', pageSlug: 'home', isActive: true, autoPlay: true, autoPlayInterval: 6000, transitionType: 'fade' })
        .mockResolvedValueOnce({
          id: 'b1',
          name: 'B',
          pageSlug: 'home',
          isActive: false,
          autoPlay: false,
          autoPlayInterval: 3000,
          transitionType: 'slide',
          slides: [],
        })
      mockBannerUpdate.mockResolvedValue({})
      const result = await HeroBannerService.updateBanner('b1', {
        isActive: false,
        autoPlay: false,
        autoPlayInterval: 3000,
        transitionType: 'slide',
      }, 'u1')
      expect(result.transitionType).toBe('slide')
      expect(mockBannerUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
            autoPlay: false,
            autoPlayInterval: 3000,
            transitionType: 'slide',
          }),
        })
      )
    })

    it('throws ValidationError when updating to pageSlug already taken by another banner', async () => {
      mockBannerFindFirst
        .mockResolvedValueOnce({ id: 'b1', pageSlug: 'home' })
        .mockResolvedValueOnce({ id: 'other', pageSlug: 'about' })
      await expect(
        HeroBannerService.updateBanner('b1', { pageSlug: 'about' }, 'u1')
      ).rejects.toThrow('already exists')
    })

    it('allows update when pageSlug unchanged', async () => {
      mockBannerFindFirst
        .mockResolvedValueOnce({ id: 'b1', pageSlug: 'home' })
        .mockResolvedValueOnce({ id: 'b1', name: 'Updated', pageSlug: 'home', autoPlay: true, autoPlayInterval: 6000, transitionType: 'fade', slides: [] })
      mockBannerUpdate.mockResolvedValue({})
      const result = await HeroBannerService.updateBanner('b1', { name: 'Updated', pageSlug: 'home' }, 'u1')
      expect(result.name).toBe('Updated')
    })

    it('invalidates cache for both old and new pageSlug when pageSlug changes', async () => {
      const cacheDelete = (await import('@/lib/cache')).cacheDelete as jest.Mock
      mockBannerFindFirst
        .mockResolvedValueOnce({ id: 'b1', pageSlug: 'home' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'b1', name: 'B', pageSlug: 'about', autoPlay: true, autoPlayInterval: 6000, transitionType: 'fade', slides: [] })
      mockBannerUpdate.mockResolvedValue({})
      await HeroBannerService.updateBanner('b1', { pageSlug: 'about' }, 'u1')
      expect(cacheDelete).toHaveBeenCalledWith('websiteContent', 'hero-banner:home')
      expect(cacheDelete).toHaveBeenCalledWith('websiteContent', 'hero-banner:about')
    })
  })

  describe('deleteBanner', () => {
    it('throws NotFoundError when banner not found', async () => {
      mockBannerFindFirst.mockResolvedValue(null)
      await expect(HeroBannerService.deleteBanner('missing', 'u1')).rejects.toThrow('Hero banner')
    })

    it('soft-deletes banner and logs with metadata', async () => {
      mockBannerFindFirst.mockResolvedValue({ id: 'b1', pageSlug: 'home' })
      mockBannerUpdate.mockResolvedValue({})
      const { AuditService } = await import('@/lib/services/audit.service')
      const logMock = AuditService.log as jest.Mock
      await HeroBannerService.deleteBanner('b1', 'u1')
      expect(mockBannerUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
      expect(logMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'hero_banner.deleted',
          resourceType: 'heroBanner',
          resourceId: 'b1',
          metadata: { pageSlug: 'home' },
        })
      )
    })
  })

  describe('createSlide', () => {
    it('throws NotFoundError when banner not found', async () => {
      mockBannerFindFirst.mockResolvedValue(null)
      await expect(
        HeroBannerService.createSlide('missing', {
          imageUrl: 'https://example.com/img.jpg',
          titleAr: 'عربي',
          titleEn: 'English',
          isActive: true,
          order: 0,
          ctaStyle: 'primary',
          overlayOpacity: 0.3,
          textPosition: 'start',
        }, 'u1')
      ).rejects.toThrow('Hero banner')
    })

    it('uses order -1 when banner has no slides (aggregate returns null)', async () => {
      mockBannerFindFirst
        .mockResolvedValueOnce({ id: 'b1', pageSlug: 'home' })
        .mockResolvedValueOnce({ id: 'b1', name: 'B', pageSlug: 'home', autoPlay: true, autoPlayInterval: 6000, transitionType: 'fade', slides: [] })
      mockSlideAggregate.mockResolvedValue({ _max: { order: null } })
      mockSlideCreate.mockResolvedValue({ ...baseSlide, id: 's1', order: 0 })
      const result = await HeroBannerService.createSlide('b1', {
        imageUrl: 'https://example.com/img.jpg',
        titleAr: 'عربي',
        titleEn: 'English',
        isActive: true,
        order: 0,
        ctaStyle: 'primary',
        overlayOpacity: 0.3,
        textPosition: 'start',
      }, 'u1')
      expect(result.id).toBe('b1')
      expect(mockSlideCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 0 }),
        })
      )
    })

    it('creates slide', async () => {
      mockBannerFindFirst
        .mockResolvedValueOnce({ id: 'b1', pageSlug: 'home' })
        .mockResolvedValueOnce({ id: 'b1', name: 'B', pageSlug: 'home', autoPlay: true, autoPlayInterval: 6000, transitionType: 'fade', slides: [{ ...baseSlide }] })
      mockSlideAggregate.mockResolvedValue({ _max: { order: 0 } })
      mockSlideCreate.mockResolvedValue({ ...baseSlide, id: 's1' })
      const result = await HeroBannerService.createSlide('b1', {
        imageUrl: 'https://example.com/img.jpg',
        titleAr: 'عربي',
        titleEn: 'English',
        isActive: true,
        order: 0,
        ctaStyle: 'primary',
        overlayOpacity: 0.3,
        textPosition: 'start',
      }, 'u1')
      expect(result.id).toBe('b1')
      expect(mockSlideCreate).toHaveBeenCalled()
    })

    it('creates slide with all optional fields', async () => {
      mockBannerFindFirst
        .mockResolvedValueOnce({ id: 'b1', pageSlug: 'home' })
        .mockResolvedValueOnce({
          id: 'b1',
          name: 'B',
          pageSlug: 'home',
          autoPlay: true,
          autoPlayInterval: 6000,
          transitionType: 'fade',
          slides: [{
            ...baseSlide,
            mobileImageUrl: 'https://example.com/mobile.jpg',
            videoUrl: 'https://example.com/video.mp4',
            titleZh: '中文',
            subtitleAr: 'فرعي',
            overlayOpacity: 0.5,
            textPosition: 'center',
            isActive: true,
            publishAt: new Date(),
            unpublishAt: new Date(Date.now() + 86400000),
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
        })
      mockSlideAggregate.mockResolvedValue({ _max: { order: 2 } })
      mockSlideCreate.mockResolvedValue({ ...baseSlide, id: 's2' })
      const result = await HeroBannerService.createSlide('b1', {
        imageUrl: 'https://example.com/img.jpg',
        mobileImageUrl: 'https://example.com/mobile.jpg',
        videoUrl: 'https://example.com/video.mp4',
        titleAr: 'عربي',
        titleEn: 'English',
        titleZh: '中文',
        subtitleAr: 'فرعي',
        isActive: true,
        order: 0,
        ctaStyle: 'secondary',
        cta2Style: 'outline',
        overlayOpacity: 0.5,
        textPosition: 'center',
        publishAt: new Date(),
        unpublishAt: new Date(Date.now() + 86400000),
      }, 'u1')
      expect(result.id).toBe('b1')
      expect(result.slides).toHaveLength(1)
      expect(mockSlideCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mobileImageUrl: 'https://example.com/mobile.jpg',
            videoUrl: 'https://example.com/video.mp4',
            titleZh: '中文',
            overlayOpacity: 0.5,
            textPosition: 'center',
            ctaStyle: 'secondary',
            cta2Style: 'outline',
          }),
        })
      )
    })
  })

  describe('updateSlide', () => {
    it('throws NotFoundError when slide not found', async () => {
      ;(prisma.heroSlide.findFirst as jest.Mock).mockResolvedValue(null)
      await expect(
        HeroBannerService.updateSlide('missing', { titleEn: 'Updated' }, 'u1')
      ).rejects.toThrow('Hero slide')
    })

    it('updates slide', async () => {
      ;(prisma.heroSlide.findFirst as jest.Mock).mockResolvedValue({
        ...baseSlide,
        id: 's1',
        bannerId: 'b1',
        banner: { id: 'b1', pageSlug: 'home', deletedAt: null },
      })
      mockBannerFindFirst.mockResolvedValue({
        id: 'b1',
        name: 'B',
        pageSlug: 'home',
        autoPlay: true,
        autoPlayInterval: 6000,
        transitionType: 'fade',
        slides: [{ ...baseSlide, titleEn: 'Updated', isActive: true, publishAt: null, unpublishAt: null, createdAt: new Date(), updatedAt: new Date() }],
      })
      ;(prisma.heroSlide.update as jest.Mock).mockResolvedValue({})
      const result = await HeroBannerService.updateSlide('s1', { titleEn: 'Updated' }, 'u1')
      expect(result.id).toBe('b1')
    })

    it('throws NotFoundError when slide banner is deleted', async () => {
      ;(prisma.heroSlide.findFirst as jest.Mock).mockResolvedValue({
        ...baseSlide,
        id: 's1',
        bannerId: 'b1',
        banner: { id: 'b1', pageSlug: 'home', deletedAt: new Date() },
      })
      await expect(
        HeroBannerService.updateSlide('s1', { titleEn: 'Updated' }, 'u1')
      ).rejects.toThrow('Hero banner')
    })

    it('updates slide with multiple optional fields', async () => {
      ;(prisma.heroSlide.findFirst as jest.Mock).mockResolvedValue({
        ...baseSlide,
        id: 's1',
        bannerId: 'b1',
        banner: { id: 'b1', pageSlug: 'home', deletedAt: null },
      })
      mockBannerFindFirst.mockResolvedValue({
        id: 'b1',
        name: 'B',
        pageSlug: 'home',
        autoPlay: true,
        autoPlayInterval: 6000,
        transitionType: 'fade',
        slides: [{ ...baseSlide, mobileImageUrl: 'https://m.jpg', videoUrl: 'https://v.mp4', titleZh: '中文', cta2Style: 'outline', overlayOpacity: 0.5, textPosition: 'center', publishAt: new Date(), unpublishAt: new Date(Date.now() + 86400000) }],
      })
      mockSlideUpdate.mockResolvedValue({})
      const result = await HeroBannerService.updateSlide('s1', {
        mobileImageUrl: 'https://mobile.jpg',
        videoUrl: 'https://video.mp4',
        titleZh: '标题',
        subtitleAr: 'فرعي',
        badgeTextEn: 'Badge',
        ctaUrl: 'https://cta.com',
        ctaStyle: 'secondary',
        cta2TextEn: 'CTA2',
        cta2Url: 'https://cta2.com',
        cta2Style: 'outline',
        order: 5,
        isActive: false,
        overlayOpacity: 0.6,
        textPosition: 'end',
        publishAt: new Date(),
        unpublishAt: new Date(Date.now() + 86400000),
      }, 'u1')
      expect(result.id).toBe('b1')
      expect(mockSlideUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mobileImageUrl: 'https://mobile.jpg',
            videoUrl: 'https://video.mp4',
            titleZh: '标题',
            subtitleAr: 'فرعي',
            badgeTextEn: 'Badge',
            ctaUrl: 'https://cta.com',
            ctaStyle: 'secondary',
            cta2TextEn: 'CTA2',
            cta2Url: 'https://cta2.com',
            cta2Style: 'outline',
            order: 5,
            isActive: false,
            overlayOpacity: 0.6,
            textPosition: 'end',
          }),
        })
      )
    })
  })

  describe('deleteSlide', () => {
    it('throws NotFoundError when slide not found', async () => {
      ;(prisma.heroSlide.findFirst as jest.Mock).mockResolvedValue(null)
      await expect(HeroBannerService.deleteSlide('missing', 'u1')).rejects.toThrow('Hero slide')
    })

    it('soft-deletes slide', async () => {
      ;(prisma.heroSlide.findFirst as jest.Mock).mockResolvedValue({
        id: 's1',
        bannerId: 'b1',
        banner: { id: 'b1', pageSlug: 'home' },
      })
      mockBannerFindFirst.mockResolvedValue({
        id: 'b1',
        name: 'B',
        pageSlug: 'home',
        autoPlay: true,
        autoPlayInterval: 6000,
        transitionType: 'fade',
        slides: [],
      })
      ;(prisma.heroSlide.update as jest.Mock).mockResolvedValue({})
      const result = await HeroBannerService.deleteSlide('s1', 'u1')
      expect(result.id).toBe('b1')
    })
  })

  describe('reorderSlides', () => {
    it('throws NotFoundError when banner not found', async () => {
      mockBannerFindFirst.mockResolvedValue(null)
      await expect(
        HeroBannerService.reorderSlides('missing', { slideIds: ['s1', 's2'] }, 'u1')
      ).rejects.toThrow('Hero banner')
    })

    it('reorders slides', async () => {
      mockBannerFindFirst.mockResolvedValue({
        id: 'b1',
        name: 'B',
        pageSlug: 'home',
        autoPlay: true,
        autoPlayInterval: 6000,
        transitionType: 'fade',
        slides: [],
      })
      ;(prisma.heroSlide.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
      const result = await HeroBannerService.reorderSlides('b1', { slideIds: ['s1', 's2'] }, 'u1')
      expect(result.id).toBe('b1')
    })
  })
})
