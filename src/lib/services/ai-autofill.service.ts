/**
 * @file ai-autofill.service.ts
 * @description AI autofill orchestration service for product imports
 * @module lib/services
 * @see /docs/features/imports/ for related documentation
 */

import { prisma } from '@/lib/db/prisma'
import { TranslationLocale } from '@prisma/client'
import { translateBatch, getTranslationCacheKey, getCachedTranslation, setCachedTranslation } from './translation.service'
import { generateSEOBatch } from './seo-generation.service'

export type ProductData = {
  name: string
  shortDescription?: string
  longDescription?: string
  category?: string
  brand?: string
  specifications?: Record<string, any>
  locale?: TranslationLocale
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
  cost?: number
}

/**
 * Autofill missing fields for a single product
 */
export async function autofillProduct(productData: ProductData, provider?: 'openai' | 'gemini'): Promise<AutofillResult> {
  const result: AutofillResult = {
    translations: {},
    seo: {
      metaTitle: productData.name,
      metaDescription: productData.shortDescription || productData.name,
      metaKeywords: '',
    },
  }

  let totalCost = 0

  // Generate SEO
  try {
    const seoResult = await generateSEOBatch(
      [
        {
          name: productData.name,
          description: productData.longDescription || productData.shortDescription,
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
          shortDescription: productData.shortDescription || '',
          longDescription: productData.longDescription || '',
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

        // Translate descriptions if available
        let translatedShortDesc = productData.shortDescription || ''
        let translatedLongDesc = productData.longDescription || ''

        if (productData.shortDescription) {
          const shortDescKey = getTranslationCacheKey(productData.shortDescription, sourceLocale, targetLocale)
          const cachedShortDesc = getCachedTranslation(shortDescKey)

          if (cachedShortDesc) {
            translatedShortDesc = cachedShortDesc
          } else {
            const shortDescTranslation = await translateBatch(
              [
                {
                  text: productData.shortDescription,
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

        if (productData.longDescription) {
          const longDescKey = getTranslationCacheKey(productData.longDescription, sourceLocale, targetLocale)
          const cachedLongDesc = getCachedTranslation(longDescKey)

          if (cachedLongDesc) {
            translatedLongDesc = cachedLongDesc
          } else {
            const longDescTranslation = await translateBatch(
              [
                {
                  text: productData.longDescription,
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
 * Autofill only missing fields for a product
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
    specifications?: Record<string, any>
  },
  provider?: 'openai' | 'gemini'
): Promise<Partial<AutofillResult>> {
  const result: Partial<AutofillResult> = {
    translations: {},
    seo: { metaTitle: '', metaDescription: '', metaKeywords: '' },
  }

  // Fill missing SEO
  if (!existingData.seoTitle || !existingData.seoDescription) {
    try {
      const seoResult = await generateSEOBatch(
        [
          {
            name: existingData.name || '',
            description: existingData.longDescription || existingData.shortDescription,
            category: context.category,
            brand: context.brand,
            specifications: context.specifications,
          },
        ],
        provider
      )

      if (seoResult[0]) {
        result.seo = {
          metaTitle: existingData.seoTitle || seoResult[0].metaTitle,
          metaDescription: existingData.seoDescription || seoResult[0].metaDescription,
          metaKeywords: existingData.seoKeywords || seoResult[0].metaKeywords,
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
        const translationContext = `${context.category || ''} ${context.brand || ''}`.trim()
        const nameTranslation = await translateBatch(
          [
            {
              text: existingData.name || '',
              sourceLocale,
              targetLocale,
              context: translationContext,
            },
          ],
          provider
        )

        if (nameTranslation[0] && !result.translations) {
          result.translations = {}
        }

        if (nameTranslation[0]) {
          result.translations![targetLocale] = {
            name: nameTranslation[0].translatedText,
            shortDescription: existingTranslation?.shortDescription || '',
            longDescription: existingTranslation?.longDescription || '',
          }
        }
      } catch (error) {
        console.error(`Translation to ${targetLocale} failed:`, error)
      }
    }
  }

  return result
}
