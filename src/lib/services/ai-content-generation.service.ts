/**
 * @file ai-content-generation.service.ts
 * @description Shared LLM calls for content generation (description, box contents, tags).
 * Supports OpenAI and Gemini providers with retry logic and provider fallback.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  MASTER_SYSTEM_PROMPT,
  buildMasterFillPrompt,
  parseMasterFillOutput,
} from '@/lib/prompts/master-fill'
import { decrypt, isEncrypted } from '@/lib/utils/encryption'
import type {
  MasterFillInput,
  MasterFillOutput,
  MasterFillWithResearchInput,
} from '@/lib/prompts/master-fill'

export type ContentProvider = 'openai' | 'gemini'

async function getSettings(provider: ContentProvider) {
  return prisma.aISettings.findUnique({ where: { provider } })
}

async function resolveApiKey(provider: ContentProvider): Promise<string> {
  const settings = await getSettings(provider)
  let dbKey: string | null = null
  if (settings?.apiKey && settings.apiKey.length >= 10 && !settings.apiKey.startsWith('****')) {
    try {
      dbKey = isEncrypted(settings.apiKey) ? decrypt(settings.apiKey) : settings.apiKey
    } catch {
      dbKey = null
    }
  }
  const apiKey =
    dbKey ??
    (provider === 'gemini'
      ? (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY)
      : process.env.OPENAI_API_KEY)
  if (!apiKey) {
    throw new Error(`No API key for provider: ${provider}`)
  }
  return apiKey
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
  const apiKey = await resolveApiKey(provider)

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
const MASTER_FILL_TEMPERATURE = 0.7
const MASTER_FILL_MAX_RETRIES = 3

function getAlternateProvider(provider: ContentProvider): ContentProvider {
  return provider === 'openai' ? 'gemini' : 'openai'
}

async function hasProviderKey(provider: ContentProvider): Promise<boolean> {
  try {
    await resolveApiKey(provider)
    return true
  } catch {
    return false
  }
}

/**
 * Generate full content (25+ fields) in one LLM call using the master fill prompt.
 * Includes retry logic with provider fallback. Never returns null — always returns
 * at least a fallback result with _needs_review flag.
 */
export async function generateMasterFill(
  provider: ContentProvider,
  input: MasterFillInput | MasterFillWithResearchInput
): Promise<MasterFillOutput> {
  const prompt = buildMasterFillPrompt(input)

  let lastError: Error | null = null
  let currentProvider = provider

  for (let attempt = 1; attempt <= MASTER_FILL_MAX_RETRIES; attempt++) {
    try {
      const apiKey = await resolveApiKey(currentProvider)
      let raw: string

      if (currentProvider === 'openai') {
        const openai = new OpenAI({ apiKey })
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: MASTER_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: MASTER_FILL_TEMPERATURE,
          max_tokens: MASTER_FILL_MAX_TOKENS,
        })
        raw = response.choices[0]?.message?.content?.trim() ?? ''
      } else if (currentProvider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          generationConfig: { maxOutputTokens: MASTER_FILL_MAX_TOKENS },
        })
        const result = await model.generateContent(
          `${MASTER_SYSTEM_PROMPT}\n\n${prompt}`
        )
        raw = result.response.text().trim()
      } else {
        throw new Error(`Unsupported provider: ${currentProvider}`)
      }

      if (!raw) {
        throw new Error('Empty response from LLM')
      }

      const parsed = parseMasterFillOutput(raw, input.name)

      if (!parsed._parse_failed) {
        return parsed
      }

      if (attempt < MASTER_FILL_MAX_RETRIES) {
        console.warn(
          `[MasterFill] Attempt ${attempt} parse failed for "${input.name}". Retrying...`
        )
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(
        `[MasterFill] Attempt ${attempt} failed for "${input.name}": ${lastError.message}`
      )

      if (attempt === 2) {
        const alt = getAlternateProvider(currentProvider)
        if (await hasProviderKey(alt)) {
          console.info(`[MasterFill] Switching to backup provider: ${alt}`)
          currentProvider = alt
        }
      }

      if (attempt < MASTER_FILL_MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000))
      }
    }
  }

  const keyHint = getGeminiKeyHint(lastError)
  console.error(
    `[MasterFill] All ${MASTER_FILL_MAX_RETRIES} attempts failed for "${input.name}". Using fallback.${keyHint ? ` ${keyHint}` : ''}`
  )
  return parseMasterFillOutput('', input.name)
}

/**
 * If the error is a known Gemini API key issue, return a short hint for fixing it.
 * See docs/GEMINI_API_KEY_SETUP.md for full steps.
 */
function getGeminiKeyHint(error: Error | null): string {
  if (!error?.message) return ''
  const msg = error.message
  if (msg.includes('API_KEY_HTTP_REFERRER_BLOCKED') || msg.includes('referer <empty>')) {
    return 'Fix: Use a Gemini API key with no HTTP referrer restriction (server-side has no referer). See docs/GEMINI_API_KEY_SETUP.md'
  }
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key expired') || msg.includes('API Key not found')) {
    return 'Fix: Create a new Gemini API key in Google AI Studio, set it in Admin > AI Settings or .env GEMINI_API_KEY. See docs/GEMINI_API_KEY_SETUP.md'
  }
  return ''
}
