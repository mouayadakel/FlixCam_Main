/**
 * @file ai-content-generation.service.ts
 * @description Shared LLM calls for content generation (description, box contents, tags).
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildMasterFillPrompt, parseMasterFillOutput } from '@/lib/prompts/master-fill'
import type {
  MasterFillInput,
  MasterFillOutput,
  MasterFillWithResearchInput,
} from '@/lib/prompts/master-fill'

export type ContentProvider = 'openai' | 'gemini'

async function getSettings(provider: ContentProvider) {
  return prisma.aISettings.findUnique({ where: { provider } })
}

/**
 * Call LLM with system and user prompt; returns raw text (or parsed JSON if response looks like JSON).
 * @param maxTokens - optional; default 1000. Use higher (e.g. 2000) for long-form description/JSON.
 */
export async function generateWithLLM(
  provider: ContentProvider,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 1000
): Promise<string | object> {
  const settings = await getSettings(provider)
  const apiKey =
    settings?.apiKey ??
    (provider === 'gemini'
      ? (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY)
      : process.env.OPENAI_API_KEY)
  if (!apiKey) {
    throw new Error(`No API key for provider: ${provider}`)
  }

  if (provider === 'openai') {
    const openai = new OpenAI({ apiKey })
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: maxTokens,
    })
    const content = response.choices[0]?.message?.content?.trim() ?? ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as object
      } catch {
        return content
      }
    }
    return content
  }

  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { maxOutputTokens: maxTokens },
    })
    const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`)
    const content = result.response.text().trim()
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as object
      } catch {
        return content
      }
    }
    return content
  }

  throw new Error(`Unsupported provider: ${provider}`)
}

const MASTER_FILL_MAX_TOKENS = 4000

/**
 * Generate full content (18+ fields) in one LLM call using the master fill prompt.
 * Used by backfill worker to consolidate descriptions, SEO, translations, box contents, tags.
 */
export async function generateMasterFill(
  provider: ContentProvider,
  input: MasterFillInput | MasterFillWithResearchInput
): Promise<MasterFillOutput | null> {
  const prompt = buildMasterFillPrompt(input)
  const settings = await getSettings(provider)
  const apiKey =
    settings?.apiKey ??
    (provider === 'gemini'
      ? (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY)
      : process.env.OPENAI_API_KEY)
  if (!apiKey) {
    throw new Error(`No API key for provider: ${provider}`)
  }

  let raw: string
  if (provider === 'openai') {
    const openai = new OpenAI({ apiKey })
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: MASTER_FILL_MAX_TOKENS,
    })
    raw = response.choices[0]?.message?.content?.trim() ?? ''
  } else if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    raw = result.response.text().trim()
  } else {
    throw new Error(`Unsupported provider: ${provider}`)
  }

  return parseMasterFillOutput(raw)
}
