import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import {
  flattenTranslations,
  getLatestTranslationJob,
  loadLocaleMessages,
} from '@/lib/services/ai-translations-admin.service'

const querySchema = z.object({
  sourceLocale: z.string().min(2).max(10).default('en'),
})

type KeyStatus = 'pending' | 'translated' | 'reviewed' | 'approved'

interface TranslationKeyItem {
  key: string
  sourceValue: string
  translations: Record<string, string>
  status: KeyStatus
  confidence?: number
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [canRead, canUpdate] = await Promise.all([
      hasPermission(userId, PERMISSIONS.SETTINGS_READ),
      hasPermission(userId, PERMISSIONS.SETTINGS_UPDATE),
    ])
    if (!canRead && !canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries())
    const parsedQuery = querySchema.safeParse(rawQuery)
    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
    }

    const sourceLocale = parsedQuery.data.sourceLocale
    const sourceMessages = await loadLocaleMessages(sourceLocale)
    const sourceKeys = flattenTranslations(sourceMessages)
    const latestJob = getLatestTranslationJob()

    const generatedByLocale: Record<string, Record<string, string>> = {}
    if (latestJob?.translationsByLocale) {
      for (const [locale, localeTranslations] of Object.entries(latestJob.translationsByLocale)) {
        generatedByLocale[locale] = flattenTranslations(localeTranslations)
      }
    }

    const approvedRows = await prisma.translation.findMany({
      where: {
        entityType: 'ui_messages',
        entityId: 'global',
        deletedAt: null,
      },
      select: {
        field: true,
        language: true,
        value: true,
      },
    })

    const approvedByLocale: Record<string, Record<string, string>> = {}
    for (const row of approvedRows) {
      if (!approvedByLocale[row.language]) {
        approvedByLocale[row.language] = {}
      }
      approvedByLocale[row.language][row.field] = row.value
    }

    const keys: TranslationKeyItem[] = Object.entries(sourceKeys).map(([key, sourceValue]) => {
      const generatedTranslations = Object.fromEntries(
        Object.entries(generatedByLocale)
          .map(([locale, values]) => [locale, values[key]])
          .filter(([, value]) => typeof value === 'string' && value.length > 0)
      ) as Record<string, string>

      const approvedTranslations = Object.fromEntries(
        Object.entries(approvedByLocale)
          .map(([locale, values]) => [locale, values[key]])
          .filter(([, value]) => typeof value === 'string' && value.length > 0)
      ) as Record<string, string>

      const translations = {
        ...generatedTranslations,
        ...approvedTranslations,
      }
      const status: KeyStatus =
        Object.keys(approvedTranslations).length > 0
          ? 'approved'
          : Object.keys(generatedTranslations).length > 0
            ? 'translated'
            : 'pending'

      return {
        key,
        sourceValue,
        translations,
        status,
      }
    })

    return NextResponse.json({ keys })
  } catch (error) {
    console.error('Failed to load translation keys:', error)
    return NextResponse.json({ error: 'Failed to load translation keys' }, { status: 500 })
  }
}
