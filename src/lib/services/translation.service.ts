/**
 * @file translation.service.ts
 * @description Business logic for translations (polymorphic)
 * @module services/translation
 */

import { prisma } from '@/lib/db/prisma'

export interface TranslationInput {
  field: string
  language: string
  value: string
}

export interface TranslationOutput {
  field: string
  language: string
  value: string
}

export class TranslationService {
  /**
   * Save translations for an entity
   */
  static async saveTranslations(
    entityType: string,
    entityId: string,
    translations: TranslationInput[],
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // Delete existing translations for this entity
      await tx.translation.updateMany({
        where: {
          entityType,
          entityId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      })

      // Create new translations
      const created = await Promise.all(
        translations.map((translation) =>
          tx.translation.create({
            data: {
              entityType,
              entityId,
              field: translation.field,
              language: translation.language,
              value: translation.value,
              createdBy: userId,
            },
          })
        )
      )

      return created
    })
  }

  /**
   * Get all translations for an entity
   */
  static async getTranslations(entityType: string, entityId: string) {
    const translations = await prisma.translation.findMany({
      where: {
        entityType,
        entityId,
        deletedAt: null,
      },
      orderBy: [
        { language: 'asc' },
        { field: 'asc' },
      ],
    })

    // Group by language and field
    const grouped: Record<string, Record<string, string>> = {}
    translations.forEach((t) => {
      if (!grouped[t.language]) {
        grouped[t.language] = {}
      }
      grouped[t.language][t.field] = t.value
    })

    return grouped
  }

  /**
   * Get translations formatted for forms (by locale)
   */
  static async getTranslationsByLocale(entityType: string, entityId: string) {
    const translations = await this.getTranslations(entityType, entityId)

    const locales = ['ar', 'en', 'zh']
    const result: Record<string, {
      name?: string
      description?: string
      shortDescription?: string
      seoTitle?: string
      seoDescription?: string
      seoKeywords?: string
    }> = {}

    locales.forEach((locale) => {
      if (translations[locale]) {
        result[locale] = {
          name: translations[locale]['name'],
          description: translations[locale]['description'],
          shortDescription: translations[locale]['short_description'],
          seoTitle: translations[locale]['seo_title'],
          seoDescription: translations[locale]['seo_description'],
          seoKeywords: translations[locale]['seo_keywords'],
        }
      }
    })

    return result
  }

  /**
   * Delete all translations for an entity
   */
  static async deleteTranslations(entityType: string, entityId: string, userId: string) {
    await prisma.translation.updateMany({
      where: {
        entityType,
        entityId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    return { success: true }
  }

  /**
   * Convert form translations to TranslationInput array
   */
  static formatTranslationsForSave(
    translations: Array<{
      locale: string
      name?: string
      description?: string
      shortDescription?: string
      seoTitle?: string
      seoDescription?: string
      seoKeywords?: string
    }>
  ): TranslationInput[] {
    const result: TranslationInput[] = []

    translations.forEach((t) => {
      if (t.name) {
        result.push({ field: 'name', language: t.locale, value: t.name })
      }
      if (t.description) {
        result.push({ field: 'description', language: t.locale, value: t.description })
      }
      if (t.shortDescription) {
        result.push({ field: 'short_description', language: t.locale, value: t.shortDescription })
      }
      if (t.seoTitle) {
        result.push({ field: 'seo_title', language: t.locale, value: t.seoTitle })
      }
      if (t.seoDescription) {
        result.push({ field: 'seo_description', language: t.locale, value: t.seoDescription })
      }
      if (t.seoKeywords) {
        result.push({ field: 'seo_keywords', language: t.locale, value: t.seoKeywords })
      }
    })

    return result
  }
}

// Stub exports for AI autofill / batch translation (implement when integrating translation API)
const translationCache = new Map<string, string>()

export function getTranslationCacheKey(
  text: string,
  sourceLocale: string,
  targetLocale: string
): string {
  return `${sourceLocale}:${targetLocale}:${text.slice(0, 64)}`
}

export function getCachedTranslation(key: string): string | null {
  return translationCache.get(key) ?? null
}

export function setCachedTranslation(key: string, value: string): void {
  translationCache.set(key, value)
}

export interface TranslateBatchItem {
  text: string
  sourceLocale: string
  targetLocale: string
  context?: string
}

export async function translateBatch(
  items: TranslateBatchItem[],
  _provider?: string
): Promise<Array<{ translatedText: string; cost?: number }>> {
  return items.map((item) => ({ translatedText: item.text, cost: 0 }))
}
