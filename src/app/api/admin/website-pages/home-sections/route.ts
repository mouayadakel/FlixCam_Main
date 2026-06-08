import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

type HomeSectionKey =
  | 'categories'
  | 'featured'
  | 'studios'
  | 'new_arrivals'
  | 'kit_teaser'
  | 'trust_signals'
  | 'top_brands'
  | 'testimonials'
  | 'faq'
  | 'cta'
  | 'how_it_works'

type SectionSettings = {
  key: HomeSectionKey
  label: string
  maxItems?: number
  compactMode?: 'compact' | 'comfortable'
  showProductCount?: boolean
  hideWithoutLogo?: boolean
}

type HomeSectionDefault = {
  key: HomeSectionKey
  label: string
  order: number
  isVisible: boolean
  settings: SectionSettings
}

const HOME_SECTION_DEFAULTS: HomeSectionDefault[] = [
  {
    key: 'categories',
    label: 'Categories',
    order: 10,
    isVisible: true,
    settings: { key: 'categories', label: 'Categories', maxItems: 10, compactMode: 'compact', showProductCount: false },
  },
  {
    key: 'featured',
    label: 'Featured Equipment',
    order: 20,
    isVisible: true,
    settings: { key: 'featured', label: 'Featured Equipment', maxItems: 8 },
  },
  {
    key: 'studios',
    label: 'Studios',
    order: 30,
    isVisible: true,
    settings: { key: 'studios', label: 'Studios' },
  },
  {
    key: 'new_arrivals',
    label: 'New Arrivals',
    order: 40,
    isVisible: true,
    settings: { key: 'new_arrivals', label: 'New Arrivals', maxItems: 8 },
  },
  {
    key: 'kit_teaser',
    label: 'Kit Teaser',
    order: 50,
    isVisible: true,
    settings: { key: 'kit_teaser', label: 'Kit Teaser' },
  },
  {
    key: 'trust_signals',
    label: 'Trust Signals',
    order: 60,
    isVisible: true,
    settings: { key: 'trust_signals', label: 'Trust Signals' },
  },
  {
    key: 'top_brands',
    label: 'Top Brands',
    order: 70,
    isVisible: true,
    settings: { key: 'top_brands', label: 'Top Brands', maxItems: 12, compactMode: 'compact', showProductCount: true, hideWithoutLogo: false },
  },
  {
    key: 'testimonials',
    label: 'Testimonials',
    order: 80,
    isVisible: true,
    settings: { key: 'testimonials', label: 'Testimonials' },
  },
  {
    key: 'faq',
    label: 'FAQ',
    order: 90,
    isVisible: true,
    settings: { key: 'faq', label: 'FAQ' },
  },
  {
    key: 'cta',
    label: 'CTA Banner',
    order: 100,
    isVisible: true,
    settings: { key: 'cta', label: 'CTA Banner' },
  },
  {
    key: 'how_it_works',
    label: 'How It Works Block',
    order: 110,
    isVisible: true,
    settings: { key: 'how_it_works', label: 'How It Works Block' },
  },
]

function readSectionKey(settings: unknown): HomeSectionKey | null {
  if (!settings || typeof settings !== 'object') return null
  const key = (settings as Record<string, unknown>).key
  if (typeof key !== 'string') return null
  return HOME_SECTION_DEFAULTS.some((item) => item.key === key) ? (key as HomeSectionKey) : null
}

async function ensureHomepageAndSections() {
  const page = await prisma.websitePage.upsert({
    where: { slug: 'home' },
    update: {},
    create: {
      slug: 'home',
      titleAr: 'الصفحة الرئيسية',
      titleEn: 'Homepage',
      isPublished: true,
    },
    include: {
      sections: true,
    },
  })

  const keysPresent = new Set(page.sections.map((s) => readSectionKey(s.settings)).filter(Boolean))
  const missing = HOME_SECTION_DEFAULTS.filter((item) => !keysPresent.has(item.key))

  if (missing.length > 0) {
    await prisma.websiteSection.createMany({
      data: missing.map((item) => ({
        pageId: page.id,
        type: 'CUSTOM',
        order: item.order,
        isVisible: item.isVisible,
        settings: item.settings,
      })),
    })
  }

  const refreshed = await prisma.websitePage.findUnique({
    where: { slug: 'home' },
    include: { sections: true },
  })

  if (!refreshed) return null

  const byKey = new Map<
    HomeSectionKey,
    {
      id: string
      key: HomeSectionKey
      label: string
      order: number
      isVisible: boolean
      settings: SectionSettings
    }
  >()

  for (const section of refreshed.sections) {
    const key = readSectionKey(section.settings)
    if (!key) continue
    const defaults = HOME_SECTION_DEFAULTS.find((item) => item.key === key)
    const parsedSettings =
      section.settings && typeof section.settings === 'object'
        ? (section.settings as Partial<SectionSettings>)
        : {}
    const settings: SectionSettings = {
      ...(defaults?.settings ?? { key, label: defaults?.label ?? key }),
      ...parsedSettings,
      key,
      label: defaults?.label ?? key,
    }

    byKey.set(key, {
      id: section.id,
      key,
      label: defaults?.label ?? key,
      order: section.order,
      isVisible: section.isVisible,
      settings,
    })
  }

  const sections = HOME_SECTION_DEFAULTS.map((item) => {
    const existing = byKey.get(item.key)
    return (
      existing ?? {
        id: '',
        key: item.key,
        label: item.label,
        order: item.order,
        isVisible: item.isVisible,
        settings: item.settings,
      }
    )
  }).sort((a, b) => a.order - b.order)

  return { pageId: refreshed.id, sections }
}

async function requireAdminSettingsWrite() {
  const session = await auth()
  if (!session?.user?.id)
    return {
      ok: false as const,
      response: NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Unauthorized', details: null },
        { status: 401 }
      ),
    }
  const canRead = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_READ)
  const canUpdate = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE)
  if (!canRead && !canUpdate) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { code: 'FORBIDDEN', message: 'Forbidden', details: 'Missing settings permissions' },
        { status: 403 }
      ),
    }
  }
  return { ok: true as const, userId: session.user.id, canUpdate }
}

export async function GET() {
  try {
    const access = await requireAdminSettingsWrite()
    if (!access.ok) return access.response

    const data = await ensureHomepageAndSections()
    if (!data) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Homepage not found', details: null },
        { status: 404 }
      )
    }

    return NextResponse.json({ pageId: data.pageId, sections: data.sections, canUpdate: access.canUpdate })
  } catch (error) {
    console.error('[home-sections:GET] failed', { error })
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal error',
        details: null,
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  let actorUserId: string | null = null
  let payloadSummary: { sectionsCount: number; tools?: unknown } | null = null
  try {
    const access = await requireAdminSettingsWrite()
    if (!access.ok) return access.response
    actorUserId = access.userId
    if (!access.canUpdate)
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Forbidden', details: 'SETTINGS_UPDATE is required' },
        { status: 403 }
      )

    const body = (await request.json()) as {
      sections?: Array<{
        key: HomeSectionKey
        order: number
        isVisible: boolean
        settings?: Partial<SectionSettings>
      }>
      tools?: {
        resetOrder?: boolean
        setAllVisible?: boolean
        setAllHidden?: boolean
      }
    }
    let updates = Array.isArray(body.sections) ? body.sections : []

    if (body.tools?.resetOrder) {
      updates = HOME_SECTION_DEFAULTS.map((item) => ({
        key: item.key,
        order: item.order,
        isVisible: item.isVisible,
        settings: item.settings,
      }))
    }

    if (body.tools?.setAllVisible) {
      updates = updates.map((item) => ({ ...item, isVisible: true }))
    }
    if (body.tools?.setAllHidden) {
      updates = updates.map((item) => ({ ...item, isVisible: false }))
    }
    payloadSummary = { sectionsCount: updates.length, tools: body.tools ?? null }

    const invalid = updates.some(
      (item) =>
        !HOME_SECTION_DEFAULTS.some((d) => d.key === item.key) ||
        !Number.isFinite(item.order) ||
        item.order < 0 ||
        typeof item.isVisible !== 'boolean' ||
        (item.settings?.maxItems !== undefined &&
          (!Number.isFinite(item.settings.maxItems) ||
            (item.settings.maxItems as number) < 1 ||
            (item.settings.maxItems as number) > 100))
    )
    if (invalid) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid sections payload',
          details: 'Check order, visibility, and maxItems values',
        },
        { status: 400 }
      )
    }

    const orders = updates.map((u) => u.order)
    if (new Set(orders).size !== orders.length) {
      return NextResponse.json(
        {
          code: 'DUPLICATE_ORDER',
          message: 'Duplicate section order values are not allowed',
          details: 'Each section must have a unique order number',
        },
        { status: 400 }
      )
    }

    const criticalKeys: HomeSectionKey[] = ['categories', 'featured', 'new_arrivals', 'top_brands']
    const visibleCriticalCount = updates.filter(
      (u) => criticalKeys.includes(u.key) && u.isVisible
    ).length
    if (visibleCriticalCount === 0) {
      return NextResponse.json(
        {
          code: 'CRITICAL_SECTIONS_DISABLED',
          message: 'At least one core homepage section must remain visible',
          details: criticalKeys.join(', '),
        },
        { status: 400 }
      )
    }

    const data = await ensureHomepageAndSections()
    if (!data) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: 'Homepage not found', details: null },
        { status: 404 }
      )
    }

    const existing = await prisma.websiteSection.findMany({
      where: { pageId: data.pageId },
      select: { id: true, settings: true },
    })

    const idByKey = new Map<HomeSectionKey, string>()
    for (const section of existing) {
      const key = readSectionKey(section.settings)
      if (!key) continue
      idByKey.set(key, section.id)
    }

    for (const item of updates) {
      const sectionId = idByKey.get(item.key)
      if (sectionId) {
        const defaults = HOME_SECTION_DEFAULTS.find((s) => s.key === item.key)
        const mergedSettings: SectionSettings = {
          ...(defaults?.settings ?? { key: item.key, label: defaults?.label ?? item.key }),
          ...(item.settings ?? {}),
          key: item.key,
          label: defaults?.label ?? item.key,
        }
        await prisma.websiteSection.update({
          where: { id: sectionId },
          data: { order: item.order, isVisible: item.isVisible, settings: mergedSettings },
        })
      }
    }

    const refreshed = await ensureHomepageAndSections()
    return NextResponse.json({
      pageId: refreshed?.pageId,
      sections: refreshed?.sections ?? [],
      updatedCount: updates.length,
      canUpdate: access.canUpdate,
    })
  } catch (error) {
    console.error('[home-sections:PATCH] failed', {
      error,
      message: error instanceof Error ? error.message : 'Unknown',
      userId: actorUserId,
      payloadSummary,
    })
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal error',
        details: null,
      },
      { status: 500 }
    )
  }
}
