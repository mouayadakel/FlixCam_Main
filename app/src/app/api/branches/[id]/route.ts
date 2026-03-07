/**
 * @file route.ts
 * @description API for single branch GET, PATCH, DELETE
 * @module app/api/branches/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canRead = await hasPermission(session.user.id, 'settings.read' as never)
    if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const branch = await prisma.branch.findUnique({ where: { id } })
    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 })

    return NextResponse.json({
      id: branch.id,
      name: branch.name,
      nameAr: branch.nameAr,
      address: branch.address,
      city: branch.city,
      phone: branch.phone,
      email: branch.email,
      isActive: branch.isActive,
      latitude: branch.latitude,
      longitude: branch.longitude,
      workingHours: branch.workingHours,
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
    })
  } catch (e) {
    console.error('Branch get error:', e)
    return NextResponse.json({ error: 'Failed to load branch' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canWrite = await hasPermission(session.user.id, 'settings.write' as never)
    if (!canWrite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const {
      name,
      nameAr,
      address,
      city,
      phone,
      email,
      isActive,
      latitude,
      longitude,
      workingHours,
    } = body

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        ...(typeof name === 'string' && { name: name.trim() }),
        ...(nameAr !== undefined && {
          nameAr: typeof nameAr === 'string' ? nameAr.trim() || null : null,
        }),
        ...(address !== undefined && {
          address: typeof address === 'string' ? address.trim() || null : null,
        }),
        ...(city !== undefined && { city: typeof city === 'string' ? city.trim() || null : null }),
        ...(phone !== undefined && {
          phone: typeof phone === 'string' ? phone.trim() || null : null,
        }),
        ...(email !== undefined && {
          email: typeof email === 'string' ? email.trim() || null : null,
        }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(latitude !== undefined && { latitude: typeof latitude === 'number' ? latitude : null }),
        ...(longitude !== undefined && {
          longitude: typeof longitude === 'number' ? longitude : null,
        }),
        ...(workingHours !== undefined && { workingHours }),
      },
    })

    return NextResponse.json({
      id: branch.id,
      name: branch.name,
      nameAr: branch.nameAr,
      address: branch.address,
      city: branch.city,
      phone: branch.phone,
      email: branch.email,
      isActive: branch.isActive,
      latitude: branch.latitude,
      longitude: branch.longitude,
      workingHours: branch.workingHours,
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
    })
  } catch (e) {
    console.error('Branch update error:', e)
    return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const canWrite = await hasPermission(session.user.id, 'settings.write' as never)
    if (!canWrite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await prisma.branch.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Branch delete error:', e)
    return NextResponse.json({ error: 'Failed to delete branch' }, { status: 500 })
  }
}
