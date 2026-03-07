/**
 * @file route.ts
 * @description API for branches (locations) CRUD
 * @module app/api/branches
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canRead = await hasPermission(session.user.id, 'settings.read' as never)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
    })

    const data = branches.map((b) => ({
      id: b.id,
      name: b.name,
      nameAr: b.nameAr,
      address: b.address,
      city: b.city,
      phone: b.phone,
      email: b.email,
      isActive: b.isActive,
      latitude: b.latitude,
      longitude: b.longitude,
      workingHours: b.workingHours,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }))

    return NextResponse.json({ data })
  } catch (e) {
    console.error('Branches list error:', e)
    return NextResponse.json({ error: 'Failed to load branches' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canWrite = await hasPermission(session.user.id, 'settings.write' as never)
    if (!canWrite) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const branch = await prisma.branch.create({
      data: {
        name: name.trim(),
        nameAr: typeof nameAr === 'string' ? nameAr.trim() || null : null,
        address: typeof address === 'string' ? address.trim() || null : null,
        city: typeof city === 'string' ? city.trim() || null : null,
        phone: typeof phone === 'string' ? phone.trim() || null : null,
        email: typeof email === 'string' ? email.trim() || null : null,
        isActive: typeof isActive === 'boolean' ? isActive : true,
        latitude: typeof latitude === 'number' ? latitude : null,
        longitude: typeof longitude === 'number' ? longitude : null,
        workingHours: workingHours ?? undefined,
      },
    })

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('Branch create error:', e)
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 })
  }
}
