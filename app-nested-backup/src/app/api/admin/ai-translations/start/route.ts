/**
 * AI Translation Job API
 * Start bulk translation using OpenAI API
 */

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

interface TranslationJob {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  sourceLocale: string
  targetLocales: string[]
  keysProcessed: number
  totalKeys: number
  createdAt: Date
  completedAt?: Date
  error?: string
}

// In-memory storage (in production, use database)
const jobs = new Map<string, TranslationJob>()

export async function POST(request: NextRequest) {
  try {
    const { sourceLocale, targetLocales, apiKey, selectedKeys } = await request.json()

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key is required' }, { status: 400 })
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey })

    // Load source translations
    const sourceTranslations = await import(`@/messages/${sourceLocale}.json`)
    const allKeys = Object.keys(flattenObject(sourceTranslations.default))

    // Filter keys if selection provided
    const keysToTranslate = selectedKeys?.length
      ? allKeys.filter((key) => selectedKeys.includes(key))
      : allKeys

    const job: TranslationJob = {
      id: generateJobId(),
      status: 'pending',
      progress: 0,
      sourceLocale,
      targetLocales,
      keysProcessed: 0,
      totalKeys: keysToTranslate.length,
      createdAt: new Date(),
    }

    jobs.set(job.id, job)

    // Start translation in background
    startTranslationJob(job.id, openai, sourceTranslations.default, keysToTranslate)

    return NextResponse.json(job)
  } catch (error) {
    console.error('Failed to start translation job:', error)
    return NextResponse.json({ error: 'Failed to start translation job' }, { status: 500 })
  }
}

export async function GET() {
  const jobList = Array.from(jobs.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )
  return NextResponse.json({ jobs: jobList })
}

async function startTranslationJob(
  jobId: string,
  openai: OpenAI,
  sourceTranslations: any,
  keysToTranslate: string[]
) {
  const job = jobs.get(jobId)!
  job.status = 'running'

  const batchSize = 10
  const targetLocales = job.targetLocales

  try {
    for (let i = 0; i < keysToTranslate.length; i += batchSize) {
      const batch = keysToTranslate.slice(i, i + batchSize)

      // Process each target locale
      for (const targetLocale of targetLocales) {
        await translateBatch(openai, sourceTranslations, batch, targetLocale, job)
      }

      job.keysProcessed = Math.min(i + batchSize, keysToTranslate.length)
      job.progress = (job.keysProcessed / job.totalKeys) * 100

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    job.status = 'completed'
    job.completedAt = new Date()
  } catch (error) {
    job.status = 'failed'
    job.error = error instanceof Error ? error.message : 'Unknown error'
  }
}

async function translateBatch(
  openai: OpenAI,
  sourceTranslations: any,
  keys: string[],
  targetLocale: string,
  job: TranslationJob
) {
  const localeNames = {
    ar: 'Arabic',
    en: 'English',
    zh: 'Chinese (Simplified)',
    fr: 'French',
    ur: 'Urdu',
    hi: 'Hindi',
  }

  const prompt = `
Translate the following JSON keys from English to ${localeNames[targetLocale as keyof typeof localeNames]}.
Maintain the JSON structure exactly. Only translate the values, not the keys.
Keep the same tone and meaning. For technical terms, use standard translations.

Source JSON:
${JSON.stringify(
  Object.fromEntries(keys.map((key) => [key, getNestedValue(sourceTranslations, key)])),
  null,
  2
)}

Requirements:
1. Return ONLY valid JSON
2. Translate values, not keys
3. Maintain the same structure
4. Use natural, fluent language
5. For UI elements, use appropriate terminology
6. For technical terms, use industry standards

Translated JSON:
`

  try {
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

    // Parse and save translations
    const translated = JSON.parse(translatedText)

    // Load existing target translations
    const targetTranslations = await import(`@/messages/${targetLocale}.json`)
    const merged = deepMerge(targetTranslations.default, unflattenObject(translated))

    // Save to file (in production, use database)
    await saveTranslations(targetLocale, merged)
  } catch (error) {
    console.error(`Failed to translate batch to ${targetLocale}:`, error)
    throw error
  }
}

function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey))
      } else {
        flattened[newKey] = obj[key]
      }
    }
  }
  return flattened
}

function unflattenObject(flat: Record<string, any>): any {
  const result: any = {}
  for (const key in flat) {
    if (flat.hasOwnProperty(key)) {
      const keys = key.split('.')
      let current = result
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = flat[key]
    }
  }
  return result
}

function getNestedValue(obj: any, key: string): any {
  return key.split('.').reduce((current, k) => current?.[k], obj)
}

function deepMerge(target: any, source: any): any {
  const output = { ...target }
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key])
    } else {
      output[key] = source[key]
    }
  }
  return output
}

async function saveTranslations(locale: string, translations: any) {
  const fs = await import('fs/promises')
  const path = await import('path')

  const filePath = path.join(process.cwd(), `src/messages/${locale}.json`)
  await fs.writeFile(filePath, JSON.stringify(translations, null, 2), 'utf-8')
}

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
