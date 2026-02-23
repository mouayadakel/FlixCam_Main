/**
 * @file translation.service.ts
 * @description Business logic for translations (polymorphic). AI translation with Gemini/OpenAI and Redis cache.
 * @module services/translation
 */

import { createHash } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { getRedisClient } from '@/lib/queue/redis.client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

const TRANSLATION_CACHE_PREFIX = 'translation:'
const CACHE_TTL_SEC = 30 * 24 * 3600 // 30 days

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 32)
}

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
      orderBy: [{ language: 'asc' }, { field: 'asc' }],
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
    const result: Record<
      string,
      {
        name?: string
        description?: string
        shortDescription?: string
        seoTitle?: string
        seoDescription?: string
        seoKeywords?: string
      }
    > = {}

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
      longDescription?: string
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
      // Save shortDescription to both field names for cross-system compatibility
      if (t.shortDescription) {
        result.push({ field: 'shortDescription', language: t.locale, value: t.shortDescription })
      }
      // Save longDescription: accept both 'description' (form) and 'longDescription' (import/AI)
      const longDesc = t.longDescription || t.description
      if (longDesc) {
        result.push({ field: 'longDescription', language: t.locale, value: longDesc })
      }
      if (t.seoTitle) {
        result.push({ field: 'seoTitle', language: t.locale, value: t.seoTitle })
      }
      if (t.seoDescription) {
        result.push({ field: 'seoDescription', language: t.locale, value: t.seoDescription })
      }
      if (t.seoKeywords) {
        result.push({ field: 'seoKeywords', language: t.locale, value: t.seoKeywords })
      }
    })

    return result
  }
}

// In-memory fallback when Redis unavailable
const translationCache = new Map<string, string>()

export function getTranslationCacheKey(
  text: string,
  sourceLocale: string,
  targetLocale: string
): string {
  return `${sourceLocale}:${targetLocale}:${hashText(text)}`
}

export function getCachedTranslation(key: string): string | null {
  return translationCache.get(key) ?? null
}

export function setCachedTranslation(key: string, value: string): void {
  translationCache.set(key, value)
  try {
    const redis = getRedisClient()
    redis
      .setex(TRANSLATION_CACHE_PREFIX + key, CACHE_TTL_SEC, value)
      .catch((err) => console.error('[translation] cache set failed', err))
  } catch (err) {
    console.error('[translation] Redis setex failed', err)
  }
}

export interface TranslateBatchItem {
  text: string
  sourceLocale: string
  targetLocale: string
  context?: string
}

/**
 * Translate text using Gemini (primary) or OpenAI (fallback). Uses Redis cache (30-day TTL).
 */
export async function translateText(
  text: string,
  targetLocale: 'en' | 'ar' | 'zh',
  sourceLocale?: string
): Promise<{ translated: string; cost: number; cached: boolean }> {
  const key = getTranslationCacheKey(text, sourceLocale ?? 'en', targetLocale)
  const memCached = getCachedTranslation(key)
  if (memCached != null) return { translated: memCached, cost: 0, cached: true }
  try {
    const redis = getRedisClient()
    const redisCached = await redis.get(TRANSLATION_CACHE_PREFIX + key)
    if (redisCached != null) {
      setCachedTranslation(key, redisCached)
      return { translated: redisCached, cost: 0, cached: true }
    }
  } catch {
    // proceed to API
  }

  const localeLabel =
    targetLocale === 'ar'
      ? 'Arabic (formal Saudi/Gulf register)'
      : targetLocale === 'zh'
        ? 'Simplified Chinese'
        : 'English'
  const systemPrompt = `You are a professional translator for cinema and film production equipment. Keep technical terms (brand names, model numbers) unchanged. Output ONLY the translated text, no quotes or labels.`
  const userPrompt = `Translate to ${localeLabel}:\n\n${text}`

  let translated = text
  let cost = 0

  try {
    const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const result = await model.generateContent([systemPrompt, userPrompt].join('\n\n'))
      const content = result.response.text().trim()
      if (content) {
        translated = content.replace(/^["']|["']$/g, '').trim()
        const estIn = Math.ceil((systemPrompt.length + userPrompt.length) / 4)
        const estOut = Math.ceil(translated.length / 4)
        cost = (estIn / 1_000_000) * 0.075 + (estOut / 1_000_000) * 0.3
      }
    }
  } catch {
    // Fallback to OpenAI
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      const openai = new OpenAI({ apiKey: openaiKey })
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      })
      const content = res.choices[0]?.message?.content?.trim()
      if (content) {
        translated = content.replace(/^["']|["']$/g, '').trim()
        const inputTokens = res.usage?.prompt_tokens ?? 0
        const outputTokens = res.usage?.completion_tokens ?? 0
        cost = (inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.6
      }
    }
  }

  setCachedTranslation(key, translated)
  return { translated, cost, cached: false }
}

/**
 * Translate multiple fields for a product (e.g. shortDescription, longDescription).
 */
export async function translateProductFields(
  _productId: string,
  targetLocale: 'en' | 'ar' | 'zh',
  fields: Record<string, string>
): Promise<{ translations: Record<string, string>; totalCost: number; cached: number }> {
  const translations: Record<string, string> = {}
  let totalCost = 0
  let cached = 0
  for (const [field, value] of Object.entries(fields)) {
    if (!value?.trim()) continue
    const { translated, cost, cached: fromCache } = await translateText(value, targetLocale, 'en')
    translations[field] = translated
    totalCost += cost
    if (fromCache) cached++
  }
  return { translations, totalCost, cached }
}

export async function translateBatch(
  items: TranslateBatchItem[],
  _provider?: string
): Promise<Array<{ translatedText: string; cost?: number }>> {
  const results: Array<{ translatedText: string; cost?: number }> = []
  for (const item of items) {
    const { translated, cost } = await translateText(
      item.text,
      item.targetLocale as 'en' | 'ar' | 'zh',
      item.sourceLocale
    )
    results.push({ translatedText: translated, cost })
  }
  return results
}
