/**
 * @file route.ts
 * @description API route for single brand - get, update, delete (soft)
 * @module app/api/brands/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { updateBrandSchema } from '@/lib/validators/brand.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

function shapeBrand(b: {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  createdAt: Date
  deletedAt: Date | null
  _count: { products: number }
}) {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: b.description ?? null,
    logoUrl: b.logo ?? null,
    website: null,
    isActive: !b.deletedAt,
    _count: { products: b._count.products },
    createdAt: b.createdAt.toISOString(),
  }
}

/**
 * GET /api/brands/:id - Get one brand
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { id } = await params
    const brand = await prisma.brand.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        createdAt: true,
        deletedAt: true,
        _count: { select: { products: true } },
      },
    })

    if (!brand) throw new NotFoundError('Brand', id)
    return NextResponse.json(shapeBrand(brand))
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PATCH /api/brands/:id - Update brand
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { id } = await params
    const body = await request.json()
    const parsed = updateBrandSchema.parse(body)

    const existing = await prisma.brand.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundError('Brand', id)

    const updateData: {
      name?: string
      slug?: string
      description?: string | null
      logo?: string | null
      updatedBy?: string
    } = { updatedBy: session.user.id }
    if (parsed.name !== undefined) updateData.name = parsed.name.trim()
    if (parsed.slug !== undefined) {
      const newSlug = parsed.slug.trim() || existing.slug
      if (newSlug !== existing.slug) {
        const conflict = await prisma.brand.findFirst({
          where: { slug: newSlug, deletedAt: null, id: { not: id } },
        })
        if (conflict) {
          return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
        }
        updateData.slug = newSlug
      }
    }
    if (parsed.description !== undefined) updateData.description = parsed.description?.trim() ?? null
    if (parsed.logoUrl !== undefined) updateData.logo = parsed.logoUrl && parsed.logoUrl !== '' ? parsed.logoUrl : null

    const brand = await prisma.brand.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        createdAt: true,
        deletedAt: true,
        _count: { select: { products: true } },
      },
    })

    return NextResponse.json(shapeBrand(brand))
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/brands/:id - Soft delete brand
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { id } = await params
    const existing = await prisma.brand.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) throw new NotFoundError('Brand', id)

    await prisma.brand.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
