/**
 * GET /api/public/compare?ids=id1,id2,id3
 * Returns equipment items and spec matrix for side-by-side comparison (2–4 items).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { flattenStructuredSpecs } from '@/lib/utils/specifications.utils'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'

const PRIORITY_KEYS: Record<string, string[]> = {
  camera: ['sensor_size', 'max_video_resolution', 'max_framerate', 'iso_range', 'weight_kg', 'mount_type', 'ibis', 'battery_life'],
  cameras: ['sensor_size', 'max_video_resolution', 'max_framerate', 'iso_range', 'weight_kg', 'mount_type', 'ibis', 'battery_life'],
  lens: ['focal_length', 'max_aperture', 'mount_type', 'format', 'min_focus_distance', 'weight_kg'],
  lenses: ['focal_length', 'max_aperture', 'mount_type', 'format', 'min_focus_distance', 'weight_kg'],
  lighting: ['max_output', 'color_temp', 'cri', 'tlci', 'power_draw', 'wireless', 'battery_life'],
  light: ['max_output', 'color_temp', 'cri', 'tlci', 'power_draw', 'wireless', 'battery_life'],
  stabilizer: ['max_payload_kg', 'axes', 'max_runtime', 'wireless_range', 'weight_kg'],
  stabilizers: ['max_payload_kg', 'axes', 'max_runtime', 'wireless_range', 'weight_kg'],
  audio: ['frequency_response', 'max_spl', 'polar_pattern', 'connection_type', 'battery_life'],
  microphone: ['frequency_response', 'max_spl', 'polar_pattern', 'connection_type', 'battery_life'],
  live: ['type', 'inputs', 'resolution', 'audio', 'effects', 'streaming', 'keying'],
  mixing: ['type', 'inputs', 'resolution', 'audio', 'effects', 'streaming', 'keying'],
}

function getFlattenedSpecs(rawSpecs: unknown): Record<string, string> {
  if (rawSpecs == null || typeof rawSpecs !== 'object') return {}
  try {
    if (isStructuredSpecifications(rawSpecs)) {
      return flattenStructuredSpecs(rawSpecs)
    }
    const rec = rawSpecs as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const k of Object.keys(rec)) {
      const v = rec[k]
      if (v !== undefined && v !== null) out[k] = String(v)
    }
    return out
  } catch {
    return {}
  }
}

export async function GET(req: NextRequest) {
  try {
    const ids = req.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean) ?? []
    if (ids.length < 2 || ids.length > 4) {
      return NextResponse.json(
        { error: 'Provide 2-4 equipment IDs' },
        { status: 400 }
      )
    }

    const rows = await prisma.equipment.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: {
        id: true,
        slug: true,
        model: true,
        nameEn: true,
        sku: true,
        specifications: true,
        dailyPrice: true,
        weeklyPrice: true,
        monthlyPrice: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
        media: { take: 1, select: { url: true } },
      },
    })

    if (rows.length < 2) {
      return NextResponse.json(
        { error: 'Not enough equipment found', items: [] },
        { status: 200 }
      )
    }

    const orderMap = new Map(ids.map((id, i) => [id, i]))
    const items = [...rows].sort(
      (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
    )

    const equipped = items.map((eq) => {
      const specs = getFlattenedSpecs(eq.specifications)
      const categoryName = eq.category?.name ?? null
      return {
        id: eq.id,
        name: eq.model ?? eq.nameEn ?? eq.sku ?? eq.id,
        slug: eq.slug ?? eq.id,
        image: eq.media?.[0]?.url ?? null,
        brand: eq.brand?.name ?? null,
        category: categoryName,
        dailyPrice: eq.dailyPrice != null ? Number(eq.dailyPrice) : null,
        weeklyPrice: eq.weeklyPrice != null ? Number(eq.weeklyPrice) : null,
        monthlyPrice: eq.monthlyPrice != null ? Number(eq.monthlyPrice) : null,
        description: null as string | null,
        specs,
      }
    })

    const allKeys = [...new Set(equipped.flatMap((e) => Object.keys(e.specs)))]

    const specMatrix = allKeys.map((key) => {
      const values = equipped.map((e) => e.specs[key] ?? null)
      const nonNull = values.filter(Boolean)
      const allSame = nonNull.length > 1 && new Set(nonNull).size === 1
      return {
        key,
        values,
        isDifferent: !allSame && nonNull.length > 1,
        isMissingSome: values.some((v) => !v),
      }
    })

    const categoryStr = String(equipped[0]?.category ?? '').toLowerCase()
    const priorityKeys =
      PRIORITY_KEYS[
        Object.keys(PRIORITY_KEYS).find((k) => categoryStr.includes(k)) ?? ''
      ] ?? []

    let priority = specMatrix.filter((s) => priorityKeys.includes(s.key))
    const differences = specMatrix.filter(
      (s) => s.isDifferent && !priorityKeys.includes(s.key)
    )
    const identical = specMatrix.filter(
      (s) => !s.isDifferent && !priorityKeys.includes(s.key)
    )

    if (priority.length === 0 && differences.length > 0) {
      priority = differences
    }

    const itemsForClient = equipped.map((e) => {
      const { specs: _s, ...rest } = e
      return rest
    })

    return NextResponse.json({
      items: itemsForClient,
      specMatrix: { priority, differences, identical },
      totalSpecKeys: allKeys.length,
    })
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[compare] GET error:', err)
    }
    return NextResponse.json(
      { error: 'Failed to load comparison' },
      { status: 500 }
    )
  }
}
