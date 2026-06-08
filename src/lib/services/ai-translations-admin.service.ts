export type TranslationJobStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface TranslationJob {
  id: string
  status: TranslationJobStatus
  progress: number
  sourceLocale: string
  targetLocales: string[]
  keysProcessed: number
  totalKeys: number
  createdAt: Date
  completedAt?: Date
  error?: string
  translationsByLocale?: Record<string, Record<string, unknown>>
}

const jobs = new Map<string, TranslationJob>()

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function createTranslationJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export function setTranslationJob(job: TranslationJob): void {
  jobs.set(job.id, job)
}

export function getTranslationJob(jobId: string): TranslationJob | undefined {
  return jobs.get(jobId)
}

export function listTranslationJobs(): TranslationJob[] {
  return Array.from(jobs.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function getLatestTranslationJob(): TranslationJob | undefined {
  return listTranslationJobs()[0]
}

export async function loadLocaleMessages(locale: string): Promise<Record<string, unknown>> {
  const mod = await import(`@/messages/${locale}.json`)
  if (isObject(mod.default)) {
    return mod.default
  }
  return {}
}

export function flattenTranslations(
  value: unknown,
  prefix = ''
): Record<string, string> {
  if (!isObject(value)) {
    return {}
  }

  const flattened: Record<string, string> = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    const newKey = prefix ? `${prefix}.${key}` : key
    if (isObject(nestedValue)) {
      Object.assign(flattened, flattenTranslations(nestedValue, newKey))
      continue
    }
    if (nestedValue === null || nestedValue === undefined) {
      flattened[newKey] = ''
      continue
    }
    flattened[newKey] = String(nestedValue)
  }
  return flattened
}

export function unflattenTranslations(
  flat: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [fullKey, value] of Object.entries(flat)) {
    const segments = fullKey.split('.')
    let current: Record<string, unknown> = result
    for (let i = 0; i < segments.length - 1; i += 1) {
      const segment = segments[i]
      const existing = current[segment]
      if (!isObject(existing)) {
        current[segment] = {}
      }
      current = current[segment] as Record<string, unknown>
    }
    current[segments[segments.length - 1]] = value
  }
  return result
}

export function deepMergeTranslations(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const output: Record<string, unknown> = { ...target }
  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = output[key]
    if (isObject(sourceValue) && isObject(targetValue)) {
      output[key] = deepMergeTranslations(targetValue, sourceValue)
      continue
    }
    output[key] = sourceValue
  }
  return output
}
