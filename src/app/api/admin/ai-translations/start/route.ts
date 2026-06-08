/**
 * AI Translation Job API
 * Start bulk translation using OpenAI API
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import {
  createTranslationJobId,
  deepMergeTranslations,
  flattenTranslations,
  getTranslationJob,
  listTranslationJobs,
  loadLocaleMessages,
  setTranslationJob,
  unflattenTranslations,
  type TranslationJob,
} from '@/lib/services/ai-translations-admin.service'

const startSchema = z.object({
  sourceLocale: z.string().min(2).max(10),
  targetLocales: z.array(z.string().min(2).max(10)).min(1),
  selectedKeys: z.array(z.string().min(1).max(300)).optional(),
  apiKey: z.string().min(1).optional(),
})

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canManageTranslations = await hasPermission(userId, PERMISSIONS.SETTINGS_UPDATE)
    if (!canManageTranslations) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: unknown = await request.json().catch(() => null)
    const parsed = startSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { sourceLocale, targetLocales, selectedKeys, apiKey: bodyApiKey } = parsed.data
    const apiKey = bodyApiKey ?? process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Translation service unavailable' }, { status: 503 })
    }

    const openai = new OpenAI({ apiKey })
    const sourceTranslations = await loadLocaleMessages(sourceLocale)
    const sourceFlat = flattenTranslations(sourceTranslations)
    const allKeys = Object.keys(sourceFlat)
    const keysToTranslate = selectedKeys?.length
      ? allKeys.filter((key) => selectedKeys.includes(key))
      : allKeys

    const job: TranslationJob = {
      id: createTranslationJobId(),
      status: 'pending',
      progress: 0,
      sourceLocale,
      targetLocales,
      keysProcessed: 0,
      totalKeys: keysToTranslate.length,
      createdAt: new Date(),
      translationsByLocale: {},
    }

    setTranslationJob(job)
    void startTranslationJob(job.id, openai, sourceFlat, keysToTranslate)

    return NextResponse.json(job)
  } catch (error) {
    console.error('Failed to start translation job:', error)
    return NextResponse.json({ error: 'Failed to start translation job' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ jobs: listTranslationJobs() })
}

async function startTranslationJob(
  jobId: string,
  openai: OpenAI,
  sourceTranslationsFlat: Record<string, string>,
  keysToTranslate: string[]
) {
  const job = getTranslationJob(jobId)
  if (!job) return
  job.status = 'running'

  const batchSize = 10
  try {
    for (let i = 0; i < keysToTranslate.length; i += batchSize) {
      const batch = keysToTranslate.slice(i, i + batchSize)
      for (const targetLocale of job.targetLocales) {
        await translateBatch(openai, sourceTranslationsFlat, batch, targetLocale, job)
      }

      job.keysProcessed = Math.min(i + batchSize, keysToTranslate.length)
      job.progress = job.totalKeys > 0 ? (job.keysProcessed / job.totalKeys) * 100 : 100
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    job.status = 'completed'
    job.completedAt = new Date()
  } catch {
    job.status = 'failed'
    job.error = 'Translation job failed'
  }
}

async function translateBatch(
  openai: OpenAI,
  sourceTranslationsFlat: Record<string, string>,
  keys: string[],
  targetLocale: string,
  job: TranslationJob
) {
  const localeNames: Record<string, string> = {
    ar: 'Arabic',
    en: 'English',
    zh: 'Chinese (Simplified)',
    fr: 'French',
    ur: 'Urdu',
    hi: 'Hindi',
  }

  const sourceChunk = Object.fromEntries(
    keys.map((key) => [key, sourceTranslationsFlat[key] ?? ''])
  )

  const prompt = `
Translate the following JSON keys from English to ${localeNames[targetLocale] ?? targetLocale}.
Maintain the JSON structure exactly. Only translate the values, not the keys.
Keep the same tone and meaning. For technical terms, use standard translations.

Source JSON:
${JSON.stringify(sourceChunk, null, 2)}

Requirements:
1. Return ONLY valid JSON
2. Translate values, not keys
3. Maintain the same structure
4. Use natural, fluent language
5. For UI elements, use appropriate terminology
6. For technical terms, use industry standards

Translated JSON:
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 4000,
  })

  const translatedText = response.choices[0]?.message?.content
  if (!translatedText) {
    throw new Error('No translation received')
  }

  const parsed = JSON.parse(translatedText) as unknown
  if (!isObject(parsed)) {
    throw new Error('Invalid translation payload')
  }

  const current = job.translationsByLocale?.[targetLocale] ?? {}
  const merged = deepMergeTranslations(current, unflattenTranslations(parsed))
  job.translationsByLocale = {
    ...(job.translationsByLocale ?? {}),
    [targetLocale]: merged,
  }
}
