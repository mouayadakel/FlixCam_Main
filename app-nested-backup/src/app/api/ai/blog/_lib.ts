/**
 * Shared auth, rate limit, token budget guard, and logging for blog AI routes.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { blogAiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { getClientIP } from '@/lib/utils/rate-limit'
import { BlogService } from '@/lib/services/blog.service'

/** Max estimated cost per request (USD). Reject if over. */
const MAX_COST_PER_REQUEST = 0.1

/** Rough tokens per character (conservative). */
const CHARS_PER_TOKEN = 4

/** Gemini 2.0 Flash: ~$0.10/1M input, ~$0.40/1M output. */
const COST_PER_INPUT_TOKEN = 0.0000001
const COST_PER_OUTPUT_TOKEN = 0.0000004

/** Max output tokens we allow per request (for budget guard). */
const MAX_OUTPUT_ESTIMATE = 8000

export async function requireBlogAiAuth(
  request: Request
): Promise<NextResponse | Response | { userId: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const canUse = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_READ)
  if (!canUse) {
    return NextResponse.json({ error: 'Forbidden - settings.read required' }, { status: 403 })
  }
  const rateRes = await blogAiRateLimitResponse(request, `blog-ai:${session.user.id}`)
  if (rateRes) return rateRes
  return { userId: session.user.id }
}

/**
 * Normalize content from schema (string | Record) to string for AI services.
 */
export function asContentString(content: string | Record<string, unknown>): string {
  return typeof content === 'string' ? content : JSON.stringify(content)
}

/**
 * Estimate token count from body. ~4 chars per token.
 */
export function estimateInputTokens(body: unknown): number {
  const str = typeof body === 'string' ? body : JSON.stringify(body ?? '')
  return Math.ceil(str.length / CHARS_PER_TOKEN)
}

/**
 * Reject if estimated cost exceeds $0.10. Call before invoking LLM.
 */
export function checkTokenBudget(body: unknown): NextResponse | null {
  const inputTokens = estimateInputTokens(body)
  const estimatedOutput = MAX_OUTPUT_ESTIMATE
  const cost = inputTokens * COST_PER_INPUT_TOKEN + estimatedOutput * COST_PER_OUTPUT_TOKEN
  if (cost > MAX_COST_PER_REQUEST) {
    return NextResponse.json(
      { error: 'Request too large', code: 'TOKEN_BUDGET_EXCEEDED' },
      { status: 400 }
    )
  }
  return null
}

/**
 * Estimate output tokens from response (string or JSON stringified).
 */
export function estimateOutputTokens(output: string | object): number {
  const str = typeof output === 'string' ? output : JSON.stringify(output)
  return Math.ceil(str.length / CHARS_PER_TOKEN)
}

/**
 * Log AI usage to BlogAiUsageLog. Call after each AI request.
 */
export async function logBlogAiUsage(
  endpoint: string,
  request: Request,
  opts: {
    userId?: string | null
    inputTokens: number
    outputTokens: number
    estimatedCostUsd: number
    durationMs: number
    success: boolean
    errorMessage?: string | null
  }
): Promise<void> {
  const ip = getClientIP(request)
  try {
    await BlogService.logAiUsage({
      endpoint,
      userId: opts.userId ?? null,
      ip,
      inputTokens: opts.inputTokens,
      outputTokens: opts.outputTokens,
      estimatedCostUsd: opts.estimatedCostUsd,
      durationMs: opts.durationMs,
      success: opts.success,
      errorMessage: opts.errorMessage ?? null,
    })
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[logBlogAiUsage]', e)
    }
  }
}
