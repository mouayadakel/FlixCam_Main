import { NextRequest, NextResponse } from 'next/server'
import { BlogAIService } from '@/lib/services/blog-ai.service'
import { seoScoreSchema } from '@/lib/validators/blog-ai.validator'
import { requireBlogAiAuth, checkTokenBudget, logBlogAiUsage, estimateInputTokens, estimateOutputTokens, asContentString } from '../_lib'
import { handleApiError } from '@/lib/utils/api-helpers'

const ENDPOINT = 'seo-score'

export async function POST(request: NextRequest) {
  const authResult = await requireBlogAiAuth(request)
  if (authResult instanceof NextResponse || authResult instanceof Response) return authResult
  const { userId } = authResult
  const start = Date.now()
  let body: unknown = {}
  try {
    body = await request.json()
    const budgetErr = checkTokenBudget(body)
    if (budgetErr) return budgetErr
    const { title, content, meta } = seoScoreSchema.parse(body)
    const result = await BlogAIService.seoScore(title, asContentString(content), meta ?? {})
    const durationMs = Date.now() - start
    const inputTokens = estimateInputTokens(body)
    const outputTokens = estimateOutputTokens(result)
    const estimatedCostUsd = inputTokens * 0.0000001 + outputTokens * 0.0000004
    await logBlogAiUsage(ENDPOINT, request, { userId, inputTokens, outputTokens, estimatedCostUsd, durationMs, success: true })
    return NextResponse.json(result)
  } catch (error) {
    await logBlogAiUsage(ENDPOINT, request, {
      userId,
      inputTokens: estimateInputTokens(body),
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs: Date.now() - start,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
    return handleApiError(error)
  }
}
