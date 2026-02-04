/**
 * @file seo-generation.service.ts
 * @description AI-powered SEO generation service
 * @module lib/services
 * @see /docs/features/imports/ for related documentation
 */

import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/db/prisma'

export type SEOProvider = 'openai' | 'gemini'

export type SEOContext = {
  name: string
  description?: string
  category?: string
  brand?: string
  specifications?: Record<string, any>
  locale?: string
}

export type SEOResult = {
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  provider: SEOProvider
  cost?: number
}

/**
 * Get active AI settings
 */
async function getAISettings(provider: SEOProvider) {
  const settings = await prisma.aISettings.findUnique({
    where: { provider },
  })
  return settings
}

/**
 * Generate SEO using OpenAI
 */
async function generateSEOWithOpenAI(context: SEOContext, apiKey: string): Promise<SEOResult> {
  const openai = new OpenAI({ apiKey })

  const systemPrompt = `You are an SEO expert specializing in e-commerce and equipment rental platforms. Generate optimized SEO metadata for a product.

Rules:
- Meta title: 50-60 characters, include brand and key features
- Meta description: 150-160 characters, compelling and keyword-rich
- Meta keywords: 5-10 relevant keywords, comma-separated
- Use industry-standard terminology
- Consider search intent and user queries
- Optimize for Arabic/English/Chinese markets as needed
- Include relevant technical terms

Return a JSON object with: metaTitle, metaDescription, metaKeywords`

  const userPrompt = `Product Information:
Name: ${context.name}
${context.description ? `Description: ${context.description}\n` : ''}
${context.category ? `Category: ${context.category}\n` : ''}
${context.brand ? `Brand: ${context.brand}\n` : ''}
${context.specifications ? `Specifications: ${JSON.stringify(context.specifications)}\n` : ''}
${context.locale ? `Target Locale: ${context.locale}\n` : ''}

Generate SEO metadata:`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content?.trim()
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    const parsed = JSON.parse(content) as { metaTitle: string; metaDescription: string; metaKeywords: string }

    // Estimate cost
    const inputTokens = response.usage?.prompt_tokens || 0
    const outputTokens = response.usage?.completion_tokens || 0
    const cost = (inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.6

    return {
      metaTitle: parsed.metaTitle || context.name,
      metaDescription: parsed.metaDescription || context.description || '',
      metaKeywords: parsed.metaKeywords || '',
      provider: 'openai',
      cost,
    }
  } catch (error: any) {
    console.error('OpenAI SEO generation failed:', error)
    // Fallback to basic SEO
    return {
      metaTitle: context.name.substring(0, 60),
      metaDescription: (context.description || context.name).substring(0, 160),
      metaKeywords: [context.brand, context.category, context.name].filter(Boolean).join(', '),
      provider: 'openai',
    }
  }
}

/**
 * Generate SEO using Google Gemini
 */
async function generateSEOWithGemini(context: SEOContext, apiKey: string): Promise<SEOResult> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `You are an SEO expert specializing in e-commerce and equipment rental platforms. Generate optimized SEO metadata for a product.

Product Information:
Name: ${context.name}
${context.description ? `Description: ${context.description}\n` : ''}
${context.category ? `Category: ${context.category}\n` : ''}
${context.brand ? `Brand: ${context.brand}\n` : ''}
${context.specifications ? `Specifications: ${JSON.stringify(context.specifications)}\n` : ''}
${context.locale ? `Target Locale: ${context.locale}\n` : ''}

Rules:
- Meta title: 50-60 characters, include brand and key features
- Meta description: 150-160 characters, compelling and keyword-rich
- Meta keywords: 5-10 relevant keywords, comma-separated
- Use industry-standard terminology
- Consider search intent and user queries

Return a JSON object with: metaTitle, metaDescription, metaKeywords`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const content = response.text().trim()

    // Extract JSON from response (may have markdown formatting)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const jsonContent = jsonMatch ? jsonMatch[0] : content

    const parsed = JSON.parse(jsonContent) as { metaTitle: string; metaDescription: string; metaKeywords: string }

    // Estimate cost
    const estimatedInputTokens = Math.ceil(prompt.length / 4)
    const estimatedOutputTokens = Math.ceil(content.length / 4)
    const cost = (estimatedInputTokens / 1_000_000) * 0.075 + (estimatedOutputTokens / 1_000_000) * 0.3

    return {
      metaTitle: parsed.metaTitle || context.name,
      metaDescription: parsed.metaDescription || context.description || '',
      metaKeywords: parsed.metaKeywords || '',
      provider: 'gemini',
      cost,
    }
  } catch (error: any) {
    console.error('Gemini SEO generation failed:', error)
    // Fallback to basic SEO
    return {
      metaTitle: context.name.substring(0, 60),
      metaDescription: (context.description || context.name).substring(0, 160),
      metaKeywords: [context.brand, context.category, context.name].filter(Boolean).join(', '),
      provider: 'gemini',
    }
  }
}

/**
 * Generate SEO metadata using configured provider
 */
export async function generateSEO(context: SEOContext, provider?: SEOProvider): Promise<SEOResult> {
  const effectiveProvider = provider || (process.env.AI_PROVIDER || 'openai') as SEOProvider
  const settings = await getAISettings(effectiveProvider)

  if (!settings || !settings.enabled) {
    // Fallback to basic SEO if AI is disabled
    return {
      metaTitle: context.name.substring(0, 60),
      metaDescription: (context.description || context.name).substring(0, 160),
      metaKeywords: [context.brand, context.category, context.name].filter(Boolean).join(', '),
      provider: effectiveProvider,
    }
  }

  const apiKey = settings.apiKey
  if (!apiKey) {
    // Fallback to basic SEO if no API key
    return {
      metaTitle: context.name.substring(0, 60),
      metaDescription: (context.description || context.name).substring(0, 160),
      metaKeywords: [context.brand, context.category, context.name].filter(Boolean).join(', '),
      provider: effectiveProvider,
    }
  }

  if (effectiveProvider === 'openai') {
    return generateSEOWithOpenAI(context, apiKey)
  } else if (effectiveProvider === 'gemini') {
    return generateSEOWithGemini(context, apiKey)
  } else {
    throw new Error(`Unsupported provider: ${effectiveProvider}`)
  }
}

/**
 * Batch generate SEO for multiple products
 */
export async function generateSEOBatch(
  contexts: SEOContext[],
  provider?: SEOProvider
): Promise<SEOResult[]> {
  const effectiveProvider = provider || (process.env.AI_PROVIDER || 'openai') as SEOProvider
  const settings = await getAISettings(effectiveProvider)

  if (!settings || !settings.enabled) {
    // Fallback to basic SEO for all
    return contexts.map((ctx) => ({
      metaTitle: ctx.name.substring(0, 60),
      metaDescription: (ctx.description || ctx.name).substring(0, 160),
      metaKeywords: [ctx.brand, ctx.category, ctx.name].filter(Boolean).join(', '),
      provider: effectiveProvider,
    }))
  }

  const apiKey = settings.apiKey
  if (!apiKey) {
    // Fallback to basic SEO for all
    return contexts.map((ctx) => ({
      metaTitle: ctx.name.substring(0, 60),
      metaDescription: (ctx.description || ctx.name).substring(0, 160),
      metaKeywords: [ctx.brand, ctx.category, ctx.name].filter(Boolean).join(', '),
      provider: effectiveProvider,
    }))
  }

  const results: SEOResult[] = []
  const batchSize = settings.batchSize || 50

  // Process in batches
  for (let i = 0; i < contexts.length; i += batchSize) {
    const batch = contexts.slice(i, i + batchSize)

    if (effectiveProvider === 'openai') {
      const batchResults = await Promise.allSettled(
        batch.map((ctx) => generateSEOWithOpenAI(ctx, apiKey))
      )

      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          // Fallback
          const ctx = batch[idx]
          results.push({
            metaTitle: ctx.name.substring(0, 60),
            metaDescription: (ctx.description || ctx.name).substring(0, 160),
            metaKeywords: [ctx.brand, ctx.category, ctx.name].filter(Boolean).join(', '),
            provider: effectiveProvider,
          })
        }
      })
    } else if (effectiveProvider === 'gemini') {
      const batchResults = await Promise.allSettled(
        batch.map((ctx) => generateSEOWithGemini(ctx, apiKey))
      )

      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          // Fallback
          const ctx = batch[idx]
          results.push({
            metaTitle: ctx.name.substring(0, 60),
            metaDescription: (ctx.description || ctx.name).substring(0, 160),
            metaKeywords: [ctx.brand, ctx.category, ctx.name].filter(Boolean).join(', '),
            provider: effectiveProvider,
          })
        }
      })
    }
  }

  return results
}
