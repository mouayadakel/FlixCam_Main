/**
 * @file route.ts
 * @description API route for equipment categories – list and create
 * @module app/api/categories
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { createCategorySchema } from '@/lib/validators/category.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { cacheDelete } from '@/lib/cache'

/**
 * GET /api/categories – Get all categories (flat list with equipment count for admin UI)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const { searchParams } = new URL(request.url)
    const hierarchical = searchParams.get('hierarchical') === 'true'

    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        nameAr: true,
        nameEn: true,
        nameZh: true,
        nameFr: true,
        slug: true,
        description: true,
        parentId: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
        _count: { select: { equipment: true, children: true } },
      },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })

    const shape = categories.map((c: any) => ({
      id: c.id,
      name: c.name,
      nameAr: c.nameAr ?? null,
      nameEn: c.nameEn ?? null,
      nameZh: c.nameZh ?? null,
      nameFr: c.nameFr ?? null,
      slug: c.slug,
      description: c.description ?? null,
      parentId: c.parentId ?? null,
      isActive: c.isActive,
      sortOrder: c.sortOrder,
      equipmentCount: c._count.equipment,
      childrenCount: c._count.children,
      createdAt: c.createdAt.toISOString(),
    }))

    if (hierarchical) {
      const byId = new Map(shape.map((c: any) => [c.id, { ...c, children: [] as typeof shape }]))
      const roots: typeof shape = []
      for (const c of shape) {
        const node = byId.get(c.id)!
        if (!c.parentId) {
          roots.push(node)
        } else {
          const parent = byId.get(c.parentId)
          if (parent) (parent as { children: typeof shape }).children.push(node)
          else roots.push(node)
        }
      }
      return NextResponse.json({ categories: roots })
    }

    return NextResponse.json({ categories: shape })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/categories – Create a new category
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }
    if (!(await hasPermission(session.user.id, PERMISSIONS.CATEGORY_CREATE))) {
      throw new ForbiddenError('You do not have permission to create categories')
    }

    const body = await request.json()
    const parsed = createCategorySchema.parse(body)

    const slug =
      parsed.slug?.trim() ||
      parsed.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

    if (!slug) {
      return NextResponse.json(
        {
          error:
            'Could not generate a valid slug from name. Please provide a slug (latin letters/numbers) when the name contains non-latin characters.',
        },
        { status: 400 }
      )
    }

    if (parsed.parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: parsed.parentId, deletedAt: null },
      })
      if (!parent) {
        return NextResponse.json({ error: 'Parent category not found' }, { status: 404 })
      }
    }

    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ slug }, { name: parsed.name }],
        deletedAt: null,
      },
    })
    if (existing) {
      return NextResponse.json(
        {
          error: existing.slug === slug ? 'Slug already in use' : 'Category name already exists',
        },
        { status: 409 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name: parsed.name.trim(),
        nameAr: parsed.nameAr?.trim() || null,
        nameEn: parsed.nameEn?.trim() || null,
        nameZh: parsed.nameZh?.trim() || null,
        nameFr: parsed.nameFr?.trim() || null,
        slug,
        description: parsed.description?.trim() ?? null,
        parentId: parsed.parentId ?? null,
        isActive: parsed.isActive ?? true,
        sortOrder: parsed.sortOrder ?? 0,
        createdBy: session.user.id,
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        nameEn: true,
        nameZh: true,
        nameFr: true,
        slug: true,
        description: true,
        parentId: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
        _count: { select: { equipment: true, children: true } },
      },
    })

    await cacheDelete('websiteContent', 'categories')

    return NextResponse.json({
      category: {
        id: category.id,
        name: category.name,
        nameAr: category.nameAr ?? null,
        nameEn: category.nameEn ?? null,
        nameZh: category.nameZh ?? null,
        nameFr: category.nameFr ?? null,
        slug: category.slug,
        description: category.description ?? null,
        parentId: category.parentId ?? null,
        isActive: category.isActive,
        sortOrder: category.sortOrder,
        equipmentCount: category._count.equipment,
        childrenCount: category._count.children,
        createdAt: category.createdAt.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
