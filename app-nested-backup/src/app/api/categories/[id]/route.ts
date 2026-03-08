/**
 * @file route.ts
 * @description API route for single category – get, update, delete (soft)
 * @module app/api/categories/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { updateCategorySchema } from '@/lib/validators/category.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'
import { cacheDelete } from '@/lib/cache'

function shapeCategory(c: {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  createdAt: Date
  _count: { equipment: number; children: number }
}) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    parentId: c.parentId ?? null,
    equipmentCount: c._count.equipment,
    childrenCount: c._count.children,
    createdAt: c.createdAt.toISOString(),
  }
}

/**
 * GET /api/categories/:id – Get one category
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { id } = await params
    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        createdAt: true,
        _count: { select: { equipment: true, children: true } },
      },
    })

    if (!category) throw new NotFoundError('Category', id)
    return NextResponse.json(shapeCategory(category))
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PATCH /api/categories/:id – Update category
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { id } = await params
    const body = await request.json()
    const parsed = updateCategorySchema.parse(body)

    const existing = await prisma.category.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundError('Category', id)

    if (parsed.parentId !== undefined) {
      if (parsed.parentId === id) {
        return NextResponse.json({ error: 'Category cannot be its own parent' }, { status: 400 })
      }
      if (parsed.parentId) {
        const parent = await prisma.category.findFirst({
          where: { id: parsed.parentId, deletedAt: null },
        })
        if (!parent) {
          return NextResponse.json({ error: 'Parent category not found' }, { status: 404 })
        }
      }
    }

    const updateData: {
      name?: string
      slug?: string
      description?: string | null
      parentId?: string | null
      updatedBy?: string
    } = { updatedBy: session.user.id }
    if (parsed.name !== undefined) updateData.name = parsed.name.trim()
    if (parsed.slug !== undefined) {
      const newSlug = (parsed.slug.trim() || existing.slug)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
      if (newSlug !== existing.slug) {
        const conflict = await prisma.category.findFirst({
          where: { slug: newSlug, deletedAt: null, id: { not: id } },
        })
        if (conflict) {
          return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
        }
        updateData.slug = newSlug
      }
    }
    if (parsed.description !== undefined)
      updateData.description = parsed.description?.trim() ?? null
    if (parsed.parentId !== undefined) updateData.parentId = parsed.parentId ?? null

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        createdAt: true,
        _count: { select: { equipment: true, children: true } },
      },
    })

    await cacheDelete('websiteContent', 'categories')
    return NextResponse.json(shapeCategory(category))
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/categories/:id – Soft delete category
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { id } = await params
    const existing = await prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { children: true, equipment: true } } },
    })
    if (!existing) throw new NotFoundError('Category', id)

    if (existing._count.children > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category that has subcategories. Move or delete them first.' },
        { status: 409 }
      )
    }

    await prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: session.user.id,
      },
    })

    await cacheDelete('websiteContent', 'categories')
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
