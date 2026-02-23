/**
 * @file ai-autofill.service.ts
 * @description AI autofill orchestration service for product imports
 * @module lib/services
 * @see /docs/features/imports/ for related documentation
 */

import { prisma } from '@/lib/db/prisma'
import { TranslationLocale } from '@prisma/client'
import {
  translateBatch,
  getTranslationCacheKey,
  getCachedTranslation,
  setCachedTranslation,
} from './translation.service'
import { generateSEOBatch, type SEOResult } from './seo-generation.service'
import { recordCost } from '@/lib/utils/cost-tracker'

const REGION_CONTEXT =
  'Saudi Arabia B2B equipment rental market. Use formal Arabic (فصحى) when generating Arabic content.'
const PLACEHOLDER_PATTERN = /lorem|sample|test|placeholder|example text|\[.*\]/i

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function validateGeneratedText(
  text: string,
  options?: { minWords?: number; maxWords?: number; maxChars?: number }
): { valid: boolean; reason?: string } {
  if (!text || text.trim().length === 0) return { valid: false, reason: 'empty' }
  if (PLACEHOLDER_PATTERN.test(text)) return { valid: false, reason: 'placeholder_detected' }
  const words = wordCount(text)
  if (options?.minWords != null && words < options.minWords)
    return { valid: false, reason: `below_min_words_${words}` }
  if (options?.maxWords != null && words > options.maxWords)
    return { valid: false, reason: `above_max_words_${words}` }
  if (options?.maxChars != null && text.length > options.maxChars)
    return { valid: false, reason: 'above_max_chars' }
  return { valid: true }
}

export type ProductData = {
  name: string
  shortDescription?: string
  longDescription?: string
  category?: string
  brand?: string
  specifications?: Record<string, any>
  locale?: TranslationLocale
  /** Existing "what's in the box" from Excel; used to enrich description generation */
  boxContents?: string
}

export type AutofillResult = {
  translations: {
    [locale in TranslationLocale]?: {
      name: string
      shortDescription: string
      longDescription: string
    }
  }
  seo: {
    metaTitle: string
    metaDescription: string
    metaKeywords: string
  }
  /** Locale-specific SEO for ar/zh (when generated instead of copying en) */
  seoByLocale?: {
    ar?: { metaTitle: string; metaDescription: string; metaKeywords: string }
    zh?: { metaTitle: string; metaDescription: string; metaKeywords: string }
  }
  /** Generated English description when it was missing */
  generatedEnDescription?: { shortDescription: string; longDescription: string }
  cost?: number
}

/**
 * Autofill missing fields for a single product
 */
export async function autofillProduct(
  productData: ProductData,
  provider?: 'openai' | 'gemini'
): Promise<AutofillResult> {
  const result: AutofillResult = {
    translations: {},
    seo: {
      metaTitle: productData.name,
      metaDescription: productData.shortDescription || productData.name,
      metaKeywords: '',
    },
  }

  let totalCost = 0

  // When descriptions are missing, generate them so SEO and translations have content (name-only is not enough)
  let shortDesc = productData.shortDescription ?? ''
  let longDesc = productData.longDescription ?? ''
  if (productData.name && (!shortDesc || !longDesc)) {
    try {
      const effectiveProvider = (provider ?? 'gemini') as 'openai' | 'gemini'
      const boxContext = (productData as { boxContents?: string }).boxContents
      const generated = await generateDescription(
        productData.name,
        productData.category,
        productData.brand,
        productData.specifications as Record<string, unknown> | undefined,
        effectiveProvider,
        boxContext
      )
      if (generated.shortDescription && !shortDesc) shortDesc = generated.shortDescription
      if (generated.longDescription && !longDesc) longDesc = generated.longDescription
    } catch (e) {
      console.error('generateDescription in autofillProduct failed:', e)
    }
  }

  const descriptionForSeo = longDesc || shortDesc || productData.name

  // Generate SEO
  try {
    const seoResult = await generateSEOBatch(
      [
        {
          name: productData.name,
          description: descriptionForSeo,
          category: productData.category,
          brand: productData.brand,
          specifications: productData.specifications,
          locale: productData.locale || 'en',
        },
      ],
      provider
    )

    if (seoResult[0]) {
      result.seo = {
        metaTitle: seoResult[0].metaTitle,
        metaDescription: seoResult[0].metaDescription,
        metaKeywords: seoResult[0].metaKeywords,
      }
      if (seoResult[0].cost) {
        totalCost += seoResult[0].cost
      }
    }
  } catch (error) {
    console.error('SEO generation failed:', error)
    // Use fallback SEO
  }

  // Generate translations for all locales
  const sourceLocale: TranslationLocale = productData.locale || 'en'
  const targetLocales: TranslationLocale[] = ['en', 'ar', 'zh'].filter(
    (loc) => loc !== sourceLocale
  ) as TranslationLocale[]

  const context = `${productData.category || ''} ${productData.brand || ''}`.trim()

  for (const targetLocale of targetLocales) {
    try {
      // Check cache first
      const nameKey = getTranslationCacheKey(productData.name, sourceLocale, targetLocale)
      const cachedName = getCachedTranslation(nameKey)

      if (cachedName) {
        result.translations[targetLocale] = {
          name: cachedName,
          shortDescription: shortDesc,
          longDescription: longDesc,
        }
        continue
      }

      // Translate name
      const nameTranslation = await translateBatch(
        [
          {
            text: productData.name,
            sourceLocale,
            targetLocale,
            context,
          },
        ],
        provider
      )

      if (nameTranslation[0]) {
        const translatedName = nameTranslation[0].translatedText
        setCachedTranslation(nameKey, translatedName)

        // Translate descriptions if available (use generated shortDesc/longDesc when we had none)
        let translatedShortDesc = shortDesc
        let translatedLongDesc = longDesc

        if (shortDesc) {
          const shortDescKey = getTranslationCacheKey(shortDesc, sourceLocale, targetLocale)
          const cachedShortDesc = getCachedTranslation(shortDescKey)

          if (cachedShortDesc) {
            translatedShortDesc = cachedShortDesc
          } else {
            const shortDescTranslation = await translateBatch(
              [
                {
                  text: shortDesc,
                  sourceLocale,
                  targetLocale,
                  context,
                },
              ],
              provider
            )
            if (shortDescTranslation[0]) {
              translatedShortDesc = shortDescTranslation[0].translatedText
              setCachedTranslation(shortDescKey, translatedShortDesc)
              if (shortDescTranslation[0].cost) {
                totalCost += shortDescTranslation[0].cost
              }
            }
          }
        }

        if (longDesc) {
          const longDescKey = getTranslationCacheKey(longDesc, sourceLocale, targetLocale)
          const cachedLongDesc = getCachedTranslation(longDescKey)

          if (cachedLongDesc) {
            translatedLongDesc = cachedLongDesc
          } else {
            const longDescTranslation = await translateBatch(
              [
                {
                  text: longDesc,
                  sourceLocale,
                  targetLocale,
                  context,
                },
              ],
              provider
            )
            if (longDescTranslation[0]) {
              translatedLongDesc = longDescTranslation[0].translatedText
              setCachedTranslation(longDescKey, translatedLongDesc)
              if (longDescTranslation[0].cost) {
                totalCost += longDescTranslation[0].cost
              }
            }
          }
        }

        result.translations[targetLocale] = {
          name: translatedName,
          shortDescription: translatedShortDesc,
          longDescription: translatedLongDesc,
        }

        if (nameTranslation[0].cost) {
          totalCost += nameTranslation[0].cost
        }
      }
    } catch (error) {
      console.error(`Translation to ${targetLocale} failed:`, error)
      // Continue with other locales
    }
  }

  result.cost = totalCost
  result.generatedEnDescription = { shortDescription: shortDesc, longDescription: longDesc }
  return result
}

/**
 * Batch autofill multiple products
 */
export async function autofillProductsBatch(
  products: ProductData[],
  provider?: 'openai' | 'gemini'
): Promise<AutofillResult[]> {
  const results: AutofillResult[] = []

  // Process in smaller batches to avoid rate limits
  const batchSize = 10
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)

    const batchResults = await Promise.allSettled(
      batch.map((product) => autofillProduct(product, provider))
    )

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        // Fallback: return minimal result
        const product = batch[batchResults.indexOf(result)]
        results.push({
          translations: {},
          seo: {
            metaTitle: product.name,
            metaDescription: product.shortDescription || product.name,
            metaKeywords: '',
          },
        })
      }
    })

    // Small delay between batches to avoid rate limits
    if (i + batchSize < products.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return results
}

/**
 * Autofill only missing fields for a product.
 * Gemini-first, OpenAI fallback. Optional jobId for cost tracking.
 */
export async function autofillMissingFields(
  productId: string,
  existingData: {
    name?: string
    shortDescription?: string
    longDescription?: string
    seoTitle?: string
    seoDescription?: string
    seoKeywords?: string
    translations?: Array<{
      locale: TranslationLocale
      name?: string
      shortDescription?: string
      longDescription?: string
    }>
  },
  context: {
    category?: string
    brand?: string
    specifications?: Record<string, unknown>
  },
  provider?: 'openai' | 'gemini',
  options?: { jobId?: string }
): Promise<Partial<AutofillResult>> {
  const result: Partial<AutofillResult> = {
    translations: {},
    seo: { metaTitle: '', metaDescription: '', metaKeywords: '' },
  }
  const effectiveProvider = provider ?? 'gemini'

  // Generate English description when empty
  let enShort = existingData.shortDescription ?? ''
  let enLong = existingData.longDescription ?? ''
  if ((!enShort || !enLong) && existingData.name) {
    try {
      const generated = await generateDescription(
        existingData.name,
        context.category,
        context.brand,
        context.specifications,
        effectiveProvider
      )
      if (generated.shortDescription && !enShort) enShort = generated.shortDescription
      if (generated.longDescription && !enLong) enLong = generated.longDescription
      if (generated.shortDescription || generated.longDescription) {
        result.generatedEnDescription = {
          shortDescription: enShort,
          longDescription: enLong,
        }
      }
    } catch (e) {
      console.error('generateDescription failed:', e)
    }
  }

  const contextualDescription = [
    enLong || enShort,
    `Product: ${existingData.name ?? ''}.`,
    context.category ? `Category: ${context.category}.` : '',
    context.brand ? `Brand: ${context.brand}.` : '',
    REGION_CONTEXT,
  ]
    .filter(Boolean)
    .join(' ')

  // Fill missing SEO — try Gemini first, then OpenAI; validate and retry once if invalid
  if (!existingData.seoTitle || !existingData.seoDescription) {
    try {
      let seoResult: SEOResult[] = []
      const seoPayload = [
        {
          name: existingData.name || '',
          description: contextualDescription,
          category: context.category,
          brand: context.brand,
          specifications: context.specifications as Record<string, unknown> | undefined,
        },
      ]
      try {
        seoResult = await generateSEOBatch(
          seoPayload,
          effectiveProvider === 'gemini' ? 'gemini' : 'openai'
        )
      } catch {
        seoResult = await generateSEOBatch(
          seoPayload,
          effectiveProvider === 'gemini' ? 'openai' : 'gemini'
        )
      }
      let metaTitle = seoResult[0]?.metaTitle ?? ''
      let metaDescription = seoResult[0]?.metaDescription ?? ''
      const metaKeywords = seoResult[0]?.metaKeywords ?? ''
      const titleValid = validateGeneratedText(metaTitle, { maxChars: 70 })
      const descValid = validateGeneratedText(metaDescription, { minWords: 20, maxWords: 30 })
      if ((!titleValid.valid || !descValid.valid) && seoResult[0]) {
        try {
          const retry = await generateSEOBatch(
            seoPayload,
            effectiveProvider === 'gemini' ? 'openai' : 'gemini'
          )
          if (retry[0]) {
            const rTitle = validateGeneratedText(retry[0].metaTitle, { maxChars: 70 })
            const rDesc = validateGeneratedText(retry[0].metaDescription, {
              minWords: 20,
              maxWords: 30,
            })
            if (rTitle.valid && rDesc.valid) {
              metaTitle = retry[0].metaTitle
              metaDescription = retry[0].metaDescription
            }
          }
        } catch {
          // keep first result; caller may flag for manual review
        }
      }
      if (metaTitle || metaDescription) {
        result.seo = {
          metaTitle: existingData.seoTitle || metaTitle,
          metaDescription: existingData.seoDescription || metaDescription,
          metaKeywords: existingData.seoKeywords || metaKeywords,
        }
        if (options?.jobId && seoResult[0]?.cost != null) {
          await recordCost({
            jobId: options.jobId,
            feature: 'text_backfill',
            costUsd: seoResult[0].cost,
          })
        }
      }
    } catch (error) {
      console.error('SEO generation failed:', error)
    }
  }

  // Fill missing translations
  const sourceLocale: TranslationLocale = 'en'
  const targetLocales: TranslationLocale[] = ['ar', 'zh']

  for (const targetLocale of targetLocales) {
    const existingTranslation = existingData.translations?.find((t) => t.locale === targetLocale)

    if (!existingTranslation || !existingTranslation.name) {
      try {
        const translationContext =
          `${context.category ?? ''} ${context.brand ?? ''} ${REGION_CONTEXT}`.trim()
        const translatePayload = [
          {
            text: existingData.name || '',
            sourceLocale,
            targetLocale,
            context: translationContext,
          },
        ]
        let nameTranslation: Awaited<ReturnType<typeof translateBatch>>
        try {
          nameTranslation = await translateBatch(
            translatePayload,
            effectiveProvider === 'gemini' ? 'gemini' : 'openai'
          )
        } catch {
          nameTranslation = await translateBatch(
            translatePayload,
            effectiveProvider === 'gemini' ? 'openai' : 'gemini'
          )
        }
        let translatedName = nameTranslation[0]?.translatedText ?? ''
        if (translatedName && !validateGeneratedText(translatedName).valid) {
          try {
            const retry = await translateBatch(
              translatePayload,
              effectiveProvider === 'gemini' ? 'openai' : 'gemini'
            )
            if (retry[0]?.translatedText && validateGeneratedText(retry[0].translatedText).valid) {
              translatedName = retry[0].translatedText
            }
          } catch {
            // keep first result
          }
        }

        let translatedShortDesc = ''
        let translatedLongDesc = ''
        if (enShort) {
          const shortRes = await translateBatch(
            [{ text: enShort, sourceLocale, targetLocale, context: translationContext }],
            effectiveProvider === 'gemini' ? 'gemini' : 'openai'
          )
          translatedShortDesc = shortRes[0]?.translatedText ?? ''
        }
        if (enLong) {
          const longRes = await translateBatch(
            [{ text: enLong, sourceLocale, targetLocale, context: translationContext }],
            effectiveProvider === 'gemini' ? 'gemini' : 'openai'
          )
          translatedLongDesc = longRes[0]?.translatedText ?? ''
        }

        if (nameTranslation[0] && !result.translations) {
          result.translations = {}
        }
        if (translatedName) {
          result.translations![targetLocale] = {
            name: translatedName,
            shortDescription: (translatedShortDesc || existingTranslation?.shortDescription) ?? '',
            longDescription: (translatedLongDesc || existingTranslation?.longDescription) ?? '',
          }
          if (options?.jobId && nameTranslation[0]?.cost != null) {
            await recordCost({
              jobId: options.jobId,
              feature: 'text_backfill',
              costUsd: nameTranslation[0].cost,
            })
          }
        }
      } catch (error) {
        console.error(`Translation to ${targetLocale} failed:`, error)
      }
    }
  }

  // Generate locale-specific SEO for ar and zh (instead of copying English)
  const arTrans = result.translations?.ar
  const zhTrans = result.translations?.zh
  if (arTrans || zhTrans) {
    try {
      result.seoByLocale = {}
      const seoPayload: {
        name: string
        description?: string
        category?: string
        brand?: string
        specifications?: Record<string, unknown>
        locale: string
      }[] = []
      if (arTrans) {
        seoPayload.push({
          name: arTrans.name,
          description: arTrans.longDescription || arTrans.shortDescription,
          category: context.category,
          brand: context.brand,
          specifications: context.specifications,
          locale: 'ar',
        })
      }
      if (zhTrans) {
        seoPayload.push({
          name: zhTrans.name,
          description: zhTrans.longDescription || zhTrans.shortDescription,
          category: context.category,
          brand: context.brand,
          specifications: context.specifications,
          locale: 'zh',
        })
      }
      const localeSeoResults = await generateSEOBatch(
        seoPayload,
        effectiveProvider === 'gemini' ? 'gemini' : 'openai'
      )
      let idx = 0
      if (arTrans) {
        const r = localeSeoResults[idx++]
        if (r)
          result.seoByLocale!.ar = {
            metaTitle: r.metaTitle,
            metaDescription: r.metaDescription,
            metaKeywords: r.metaKeywords,
          }
      }
      if (zhTrans) {
        const r = localeSeoResults[idx]
        if (r)
          result.seoByLocale!.zh = {
            metaTitle: r.metaTitle,
            metaDescription: r.metaDescription,
            metaKeywords: r.metaKeywords,
          }
      }
    } catch (error) {
      console.error('Locale SEO generation failed:', error)
    }
  }

  return result
}

type SEOProvider = 'openai' | 'gemini'

export async function generateDescription(
  productName: string,
  category?: string,
  brand?: string,
  specifications?: Record<string, unknown>,
  provider?: SEOProvider,
  existingBoxContents?: string
): Promise<{ shortDescription: string; longDescription: string }> {
  const { generateWithLLM } = await import('./ai-content-generation.service')
  const contextParts = [
    `Product: ${productName}.`,
    `Category: ${category ?? 'N/A'}.`,
    `Brand: ${brand ?? 'N/A'}.`,
    specifications && Object.keys(specifications).length > 0
      ? `Specs: ${JSON.stringify(specifications)}`
      : '',
    existingBoxContents
      ? `What's included in the box (use to inform description): ${existingBoxContents.slice(0, 800)}`
      : '',
  ].filter(Boolean)

  const out = await generateWithLLM(
    provider ?? 'gemini',
    `You are a professional copywriter for B2B film and broadcast equipment rental. Generate real, specific product copy—no placeholders, no "lorem", no generic filler.
Return valid JSON only: { "shortDescription": "...", "longDescription": "..." }
- shortDescription: 2–4 sentences, 200–400 characters. Highlight key features, typical use cases, and why renters choose this. Be concrete.
- longDescription: 4–8 sentences, 400–800 characters. Cover features, use cases (narrative, commercial, documentary), compatibility notes, and professional appeal. Write for a rental catalog.`,
    contextParts.join(' '),
    2000
  )
  const parsed =
    typeof out === 'object' && out !== null
      ? (out as { shortDescription?: string; longDescription?: string })
      : {}
  const short = (parsed.shortDescription ?? '').trim()
  const long = (parsed.longDescription ?? '').trim()
  return {
    shortDescription: short ? short.slice(0, 600) : '',
    longDescription: long ? long.slice(0, 2500) : '',
  }
}

export async function generateBoxContents(
  productName: string,
  category?: string,
  specifications?: Record<string, unknown>,
  provider?: SEOProvider
): Promise<string> {
  const { generateWithLLM } = await import('./ai-content-generation.service')
  const text = await generateWithLLM(
    provider ?? 'gemini',
    `List what is typically included in the box for this product. Return a short paragraph or bullet list (plain text, no JSON). Be concise.`,
    `Product: ${productName}. Category: ${category ?? 'N/A'}. ${specifications ? `Specs: ${JSON.stringify(specifications)}` : ''}`
  )
  const str =
    typeof text === 'string' ? text : typeof text === 'object' ? JSON.stringify(text) : String(text)
  return str.trim().slice(0, 2000)
}

export async function generateTags(
  productName: string,
  category?: string,
  brand?: string,
  provider?: SEOProvider
): Promise<string> {
  const { generateWithLLM } = await import('./ai-content-generation.service')
  const text = await generateWithLLM(
    provider ?? 'gemini',
    `Return 5-10 comma-separated tags for search/filter (e.g. camera, 4k, cinema). Plain text only, no JSON.`,
    `Product: ${productName}. Category: ${category ?? 'N/A'}. Brand: ${brand ?? 'N/A'}.`
  )
  const str =
    typeof text === 'string' ? text : typeof text === 'object' ? JSON.stringify(text) : String(text)
  return str.trim().slice(0, 500)
}

export async function suggestRelatedProducts(
  productId: string,
  categoryId: string,
  limit: number = 5
): Promise<string[]> {
  const products = await prisma.product.findMany({
    where: {
      categoryId,
      id: { not: productId },
      deletedAt: null,
    },
    select: { id: true },
    take: limit,
  })
  return products.map((p) => p.id)
}
