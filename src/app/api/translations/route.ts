/**
 * @file route.ts
 * @description API route for translations
 * @module app/api/translations
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { TranslationService } from '@/lib/services/translation.service'

/**
 * GET /api/translations - Get translations for entity
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      )
    }

    const translations = await TranslationService.getTranslationsByLocale(entityType, entityId)

    return NextResponse.json(translations)
  } catch (error) {
    console.error('Error fetching translations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch translations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/translations - Create/update translations
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { entityType, entityId, translations } = body

    if (!entityType || !entityId || !translations) {
      return NextResponse.json(
        { error: 'entityType, entityId, and translations are required' },
        { status: 400 }
      )
    }

    const translationInputs = TranslationService.formatTranslationsForSave(translations)
    await TranslationService.saveTranslations(entityType, entityId, translationInputs, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving translations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save translations' },
      { status: 400 }
    )
  }
}

/**
 * DELETE /api/translations - Delete translations
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      )
    }

    await TranslationService.deleteTranslations(entityType, entityId, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting translations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete translations' },
      { status: 400 }
    )
  }
}
