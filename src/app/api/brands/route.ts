/**
 * @file route.ts
 * @description API route for brands - list and create
 * @module app/api/brands
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { createBrandSchema } from '@/lib/validators/brand.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { cacheDelete } from '@/lib/cache'

/**
 * GET /api/brands - Get all brands (aligned with public homepage logic)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const viewMode = request.nextUrl.searchParams.get('view') === 'raw' ? 'raw' : 'homepage'

    const brands = await prisma.brand.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        createdAt: true,
        deletedAt: true,
        _count: { select: { equipment: true, products: true } },
      },
      orderBy:
        viewMode === 'raw' ? { name: 'asc' } : { equipment: { _count: 'desc' } },
    })

    const shape = brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description ?? null,
      logoUrl: b.logo ?? null,
      website: null,
      isActive: !b.deletedAt,
      _count: {
        products: viewMode === 'raw' ? b._count.products : b._count.equipment,
      },
      equipmentCount: b._count.equipment,
      createdAt: b.createdAt.toISOString(),
    }))

    return NextResponse.json({ brands: shape })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/brands - Create a new brand
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }
    if (!(await hasPermission(session.user.id, PERMISSIONS.BRAND_CREATE))) {
      throw new ForbiddenError('You do not have permission to create brands')
    }

    const body = await request.json()
    const parsed = createBrandSchema.parse(body)

    const slug =
      (parsed.slug && parsed.slug.trim() !== ''
        ? parsed.slug.trim()
        : parsed.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')) || parsed.name.toLowerCase().replace(/\s+/g, '-')

    const existing = await prisma.brand.findFirst({
      where: {
        OR: [{ slug }, { name: parsed.name }],
        deletedAt: null,
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: existing.slug === slug ? 'Slug already in use' : 'Brand name already exists' },
        { status: 409 }
      )
    }

    const brand = await prisma.brand.create({
      data: {
        name: parsed.name.trim(),
        slug,
        description: parsed.description?.trim() ?? null,
        logo: parsed.logoUrl && parsed.logoUrl !== '' ? parsed.logoUrl : null,
        createdBy: session.user.id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        createdAt: true,
        _count: { select: { equipment: true, products: true } },
      },
    })

    await cacheDelete('websiteContent', 'brands')

    return NextResponse.json({
      brand: {
        ...brand,
        logoUrl: brand.logo,
        website: null,
        isActive: true,
        _count: { products: brand._count.equipment },
        equipmentCount: brand._count.equipment,
        createdAt: brand.createdAt.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
