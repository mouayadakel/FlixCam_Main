/**
 * @file hero-banner.service.ts
 * @description Business logic for hero banners and slides (homepage carousel)
 * @module services/hero-banner
 */

import { prisma } from '@/lib/db/prisma'
import { cacheGet, cacheSet, cacheDelete } from '@/lib/cache'
import { AuditService } from '@/lib/services/audit.service'
import { NotFoundError, ValidationError } from '@/lib/errors'
import type {
  CreateBannerInput,
  UpdateBannerInput,
  CreateSlideInput,
  UpdateSlideInput,
  ReorderSlidesInput,
} from '@/lib/validators/hero-banner.validator'

const CACHE_NS = 'websiteContent' as const
const HERO_BANNER_KEY_PREFIX = 'hero-banner:'

export interface HeroSlidePublic {
  id: string
  imageUrl: string
  mobileImageUrl: string | null
  videoUrl: string | null
  titleAr: string
  titleEn: string
  titleZh: string | null
  subtitleAr: string | null
  subtitleEn: string | null
  subtitleZh: string | null
  badgeTextAr: string | null
  badgeTextEn: string | null
  badgeTextZh: string | null
  ctaTextAr: string | null
  ctaTextEn: string | null
  ctaTextZh: string | null
  ctaUrl: string | null
  ctaStyle: string
  cta2TextAr: string | null
  cta2TextEn: string | null
  cta2TextZh: string | null
  cta2Url: string | null
  cta2Style: string | null
  order: number
  overlayOpacity: number
  textPosition: string
}

export interface HeroBannerPublic {
  id: string
  name: string
  pageSlug: string
  autoPlay: boolean
  autoPlayInterval: number
  transitionType: string
  slides: HeroSlidePublic[]
}

export interface HeroBannerListItem {
  id: string
  name: string
  pageSlug: string
  isActive: boolean
  autoPlay: boolean
  autoPlayInterval: number
  transitionType: string
  slideCount: number
  createdAt: Date
}

export interface HeroBannerWithSlides extends HeroBannerPublic {
  slides: (HeroSlidePublic & {
    isActive: boolean
    publishAt: Date | null
    unpublishAt: Date | null
    createdAt: Date
    updatedAt: Date
  })[]
}

function toSlidePublic(s: {
  id: string
  imageUrl: string
  mobileImageUrl: string | null
  videoUrl: string | null
  titleAr: string
  titleEn: string
  titleZh: string | null
  subtitleAr: string | null
  subtitleEn: string | null
  subtitleZh: string | null
  badgeTextAr: string | null
  badgeTextEn: string | null
  badgeTextZh: string | null
  ctaTextAr: string | null
  ctaTextEn: string | null
  ctaTextZh: string | null
  ctaUrl: string | null
  ctaStyle: string
  cta2TextAr: string | null
  cta2TextEn: string | null
  cta2TextZh: string | null
  cta2Url: string | null
  cta2Style: string | null
  order: number
  overlayOpacity: number
  textPosition: string
}): HeroSlidePublic {
  return {
    id: s.id,
    imageUrl: s.imageUrl,
    mobileImageUrl: s.mobileImageUrl,
    videoUrl: s.videoUrl,
    titleAr: s.titleAr,
    titleEn: s.titleEn,
    titleZh: s.titleZh,
    subtitleAr: s.subtitleAr,
    subtitleEn: s.subtitleEn,
    subtitleZh: s.subtitleZh,
    badgeTextAr: s.badgeTextAr,
    badgeTextEn: s.badgeTextEn,
    badgeTextZh: s.badgeTextZh,
    ctaTextAr: s.ctaTextAr,
    ctaTextEn: s.ctaTextEn,
    ctaTextZh: s.ctaTextZh,
    ctaUrl: s.ctaUrl,
    ctaStyle: s.ctaStyle,
    cta2TextAr: s.cta2TextAr,
    cta2TextEn: s.cta2TextEn,
    cta2TextZh: s.cta2TextZh,
    cta2Url: s.cta2Url,
    cta2Style: s.cta2Style,
    order: s.order,
    overlayOpacity: s.overlayOpacity,
    textPosition: s.textPosition,
  }
}

export class HeroBannerService {
  /**
   * Get active banner with scheduled slides for a page (public). Cached.
   */
  static async getActiveBannerByPage(pageSlug: string): Promise<HeroBannerPublic | null> {
    const cacheKey = `${HERO_BANNER_KEY_PREFIX}${pageSlug}`
    const cached = await cacheGet<HeroBannerPublic>(CACHE_NS, cacheKey)
    if (cached) return cached

    const now = new Date()
    const banner = await prisma.heroBanner.findFirst({
      where: {
        pageSlug,
        isActive: true,
        deletedAt: null,
      },
      include: {
        slides: {
          where: {
            isActive: true,
            deletedAt: null,
            AND: [
              { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
              { OR: [{ unpublishAt: null }, { unpublishAt: { gt: now } }] },
            ],
          },
          orderBy: { order: 'asc' },
        },
      },
    })
    if (!banner || banner.slides.length === 0) return null

    const result: HeroBannerPublic = {
      id: banner.id,
      name: banner.name,
      pageSlug: banner.pageSlug,
      autoPlay: banner.autoPlay,
      autoPlayInterval: banner.autoPlayInterval,
      transitionType: banner.transitionType,
      slides: banner.slides.map(toSlidePublic),
    }
    await cacheSet(CACHE_NS, cacheKey, result)
    return result
  }

  /**
   * List all banners (admin) with slide counts.
   */
  static async getAllBanners(): Promise<HeroBannerListItem[]> {
    const list = await prisma.heroBanner.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { slides: true } },
      },
      orderBy: { pageSlug: 'asc' },
    })
    return list.map((b) => ({
      id: b.id,
      name: b.name,
      pageSlug: b.pageSlug,
      isActive: b.isActive,
      autoPlay: b.autoPlay,
      autoPlayInterval: b.autoPlayInterval,
      transitionType: b.transitionType,
      slideCount: b._count.slides,
      createdAt: b.createdAt,
    }))
  }

  /**
   * Get banner by ID with all slides (admin).
   */
  static async getBannerById(id: string): Promise<HeroBannerWithSlides> {
    const banner = await prisma.heroBanner.findFirst({
      where: { id, deletedAt: null },
      include: {
        slides: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
      },
    })
    if (!banner) throw new NotFoundError('Hero banner', id)
    return {
      id: banner.id,
      name: banner.name,
      pageSlug: banner.pageSlug,
      autoPlay: banner.autoPlay,
      autoPlayInterval: banner.autoPlayInterval,
      transitionType: banner.transitionType,
      slides: banner.slides.map((s) => ({
        ...toSlidePublic(s),
        isActive: s.isActive,
        publishAt: s.publishAt,
        unpublishAt: s.unpublishAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    }
  }

  static async createBanner(data: CreateBannerInput, userId?: string): Promise<HeroBannerWithSlides> {
    const existing = await prisma.heroBanner.findFirst({
      where: { pageSlug: data.pageSlug, deletedAt: null },
    })
    if (existing) {
      throw new ValidationError('A banner with this page slug already exists', {
        pageSlug: ['Page slug must be unique'],
      })
    }

    const banner = await prisma.heroBanner.create({
      data: {
        name: data.name,
        pageSlug: data.pageSlug,
        isActive: data.isActive ?? true,
        autoPlay: data.autoPlay ?? true,
        autoPlayInterval: data.autoPlayInterval ?? 6000,
        transitionType: data.transitionType ?? 'fade',
        createdBy: userId,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    })
    await this.invalidateCache(banner.pageSlug)
    await AuditService.log({
      action: 'hero_banner.created',
      userId,
      resourceType: 'heroBanner',
      resourceId: banner.id,
      metadata: { pageSlug: banner.pageSlug },
    })
    return this.getBannerById(banner.id)
  }

  static async updateBanner(
    id: string,
    data: UpdateBannerInput,
    userId?: string
  ): Promise<HeroBannerWithSlides> {
    const existing = await prisma.heroBanner.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundError('Hero banner', id)
    if (data.pageSlug && data.pageSlug !== existing.pageSlug) {
      const taken = await prisma.heroBanner.findFirst({
        where: { pageSlug: data.pageSlug, deletedAt: null },
      })
      if (taken) {
        throw new ValidationError('A banner with this page slug already exists', {
          pageSlug: ['Page slug must be unique'],
        })
      }
    }

    await prisma.heroBanner.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.pageSlug !== undefined && { pageSlug: data.pageSlug }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.autoPlay !== undefined && { autoPlay: data.autoPlay }),
        ...(data.autoPlayInterval !== undefined && { autoPlayInterval: data.autoPlayInterval }),
        ...(data.transitionType !== undefined && { transitionType: data.transitionType }),
        updatedBy: userId,
        updatedAt: new Date(),
      },
    })
    await this.invalidateCache(existing.pageSlug)
    if (data.pageSlug) await this.invalidateCache(data.pageSlug)
    await AuditService.log({
      action: 'hero_banner.updated',
      userId,
      resourceType: 'heroBanner',
      resourceId: id,
    })
    return this.getBannerById(id)
  }

  static async deleteBanner(id: string, userId?: string): Promise<void> {
    const banner = await prisma.heroBanner.findFirst({
      where: { id, deletedAt: null },
    })
    if (!banner) throw new NotFoundError('Hero banner', id)
    await prisma.heroBanner.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId, updatedAt: new Date() },
    })
    await this.invalidateCache(banner.pageSlug)
    await AuditService.log({
      action: 'hero_banner.deleted',
      userId,
      resourceType: 'heroBanner',
      resourceId: id,
      metadata: { pageSlug: banner.pageSlug },
    })
  }

  static async createSlide(
    bannerId: string,
    data: CreateSlideInput,
    userId?: string
  ): Promise<HeroBannerWithSlides> {
    const banner = await prisma.heroBanner.findFirst({
      where: { id: bannerId, deletedAt: null },
    })
    if (!banner) throw new NotFoundError('Hero banner', bannerId)

    const maxOrder = await prisma.heroSlide
      .aggregate({
        where: { bannerId, deletedAt: null },
        _max: { order: true },
      })
      .then((r) => r._max.order ?? -1)

    await prisma.heroSlide.create({
      data: {
        bannerId,
        imageUrl: data.imageUrl,
        mobileImageUrl: data.mobileImageUrl || null,
        videoUrl: data.videoUrl || null,
        titleAr: data.titleAr,
        titleEn: data.titleEn,
        titleZh: data.titleZh || null,
        subtitleAr: data.subtitleAr || null,
        subtitleEn: data.subtitleEn || null,
        subtitleZh: data.subtitleZh || null,
        badgeTextAr: data.badgeTextAr || null,
        badgeTextEn: data.badgeTextEn || null,
        badgeTextZh: data.badgeTextZh || null,
        ctaTextAr: data.ctaTextAr || null,
        ctaTextEn: data.ctaTextEn || null,
        ctaTextZh: data.ctaTextZh || null,
        ctaUrl: data.ctaUrl || null,
        ctaStyle: data.ctaStyle ?? 'primary',
        cta2TextAr: data.cta2TextAr || null,
        cta2TextEn: data.cta2TextEn || null,
        cta2TextZh: data.cta2TextZh || null,
        cta2Url: data.cta2Url || null,
        cta2Style: data.cta2Style || null,
        order: data.order ?? maxOrder + 1,
        isActive: data.isActive ?? true,
        overlayOpacity: data.overlayOpacity ?? 0.3,
        textPosition: data.textPosition ?? 'start',
        publishAt: data.publishAt ?? null,
        unpublishAt: data.unpublishAt ?? null,
        createdBy: userId,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    })
    await this.invalidateCache(banner.pageSlug)
    await AuditService.log({
      action: 'hero_slide.created',
      userId,
      resourceType: 'heroSlide',
      resourceId: bannerId,
      metadata: { bannerId },
    })
    return this.getBannerById(bannerId)
  }

  static async updateSlide(
    slideId: string,
    data: UpdateSlideInput,
    userId?: string
  ): Promise<HeroBannerWithSlides> {
    const slide = await prisma.heroSlide.findFirst({
      where: { id: slideId, deletedAt: null },
      include: { banner: true },
    })
    if (!slide) throw new NotFoundError('Hero slide', slideId)
    if (slide.banner.deletedAt) throw new NotFoundError('Hero banner', slide.bannerId)

    await prisma.heroSlide.update({
      where: { id: slideId },
      data: {
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.mobileImageUrl !== undefined && { mobileImageUrl: data.mobileImageUrl || null }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl || null }),
        ...(data.titleAr !== undefined && { titleAr: data.titleAr }),
        ...(data.titleEn !== undefined && { titleEn: data.titleEn }),
        ...(data.titleZh !== undefined && { titleZh: data.titleZh || null }),
        ...(data.subtitleAr !== undefined && { subtitleAr: data.subtitleAr || null }),
        ...(data.subtitleEn !== undefined && { subtitleEn: data.subtitleEn || null }),
        ...(data.subtitleZh !== undefined && { subtitleZh: data.subtitleZh || null }),
        ...(data.badgeTextAr !== undefined && { badgeTextAr: data.badgeTextAr || null }),
        ...(data.badgeTextEn !== undefined && { badgeTextEn: data.badgeTextEn || null }),
        ...(data.badgeTextZh !== undefined && { badgeTextZh: data.badgeTextZh || null }),
        ...(data.ctaTextAr !== undefined && { ctaTextAr: data.ctaTextAr || null }),
        ...(data.ctaTextEn !== undefined && { ctaTextEn: data.ctaTextEn || null }),
        ...(data.ctaTextZh !== undefined && { ctaTextZh: data.ctaTextZh || null }),
        ...(data.ctaUrl !== undefined && { ctaUrl: data.ctaUrl || null }),
        ...(data.ctaStyle !== undefined && { ctaStyle: data.ctaStyle }),
        ...(data.cta2TextAr !== undefined && { cta2TextAr: data.cta2TextAr || null }),
        ...(data.cta2TextEn !== undefined && { cta2TextEn: data.cta2TextEn || null }),
        ...(data.cta2TextZh !== undefined && { cta2TextZh: data.cta2TextZh || null }),
        ...(data.cta2Url !== undefined && { cta2Url: data.cta2Url || null }),
        ...(data.cta2Style !== undefined && { cta2Style: data.cta2Style || null }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.overlayOpacity !== undefined && { overlayOpacity: data.overlayOpacity }),
        ...(data.textPosition !== undefined && { textPosition: data.textPosition }),
        ...(data.publishAt !== undefined && { publishAt: data.publishAt ?? null }),
        ...(data.unpublishAt !== undefined && { unpublishAt: data.unpublishAt ?? null }),
        updatedBy: userId,
        updatedAt: new Date(),
      },
    })
    await this.invalidateCache(slide.banner.pageSlug)
    await AuditService.log({
      action: 'hero_slide.updated',
      userId,
      resourceType: 'heroSlide',
      resourceId: slideId,
      metadata: { bannerId: slide.bannerId },
    })
    return this.getBannerById(slide.bannerId)
  }

  static async deleteSlide(slideId: string, userId?: string): Promise<HeroBannerWithSlides> {
    const slide = await prisma.heroSlide.findFirst({
      where: { id: slideId, deletedAt: null },
      include: { banner: true },
    })
    if (!slide) throw new NotFoundError('Hero slide', slideId)

    await prisma.heroSlide.update({
      where: { id: slideId },
      data: { deletedAt: new Date(), deletedBy: userId, updatedBy: userId, updatedAt: new Date() },
    })
    await this.invalidateCache(slide.banner.pageSlug)
    await AuditService.log({
      action: 'hero_slide.deleted',
      userId,
      resourceType: 'heroSlide',
      resourceId: slideId,
      metadata: { bannerId: slide.bannerId },
    })
    return this.getBannerById(slide.bannerId)
  }

  static async reorderSlides(
    bannerId: string,
    data: ReorderSlidesInput,
    userId?: string
  ): Promise<HeroBannerWithSlides> {
    const banner = await prisma.heroBanner.findFirst({
      where: { id: bannerId, deletedAt: null },
    })
    if (!banner) throw new NotFoundError('Hero banner', bannerId)

    await prisma.$transaction(
      data.slideIds.map((id, index) =>
        prisma.heroSlide.updateMany({
          where: { id, bannerId, deletedAt: null },
          data: { order: index, updatedBy: userId, updatedAt: new Date() },
        })
      )
    )
    await this.invalidateCache(banner.pageSlug)
    await AuditService.log({
      action: 'hero_slides.reordered',
      userId,
      resourceType: 'heroBanner',
      resourceId: bannerId,
      metadata: { slideIds: data.slideIds },
    })
    return this.getBannerById(bannerId)
  }

  private static async invalidateCache(pageSlug: string): Promise<void> {
    try {
      await cacheDelete(CACHE_NS, `${HERO_BANNER_KEY_PREFIX}${pageSlug}`)
    } catch {
      // ignore
    }
  }
}
