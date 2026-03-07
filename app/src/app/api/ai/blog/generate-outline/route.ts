import { NextRequest, NextResponse } from 'next/server'
import { BlogAIService } from '@/lib/services/blog-ai.service'
import { generateOutlineSchema } from '@/lib/validators/blog-ai.validator'
import { requireBlogAiAuth, checkTokenBudget, logBlogAiUsage, estimateInputTokens, estimateOutputTokens } from '../_lib'
import { handleApiError } from '@/lib/utils/api-helpers'

const ENDPOINT = 'generate-outline'

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
    const { title, language } = generateOutlineSchema.parse(body)
    const outline = await BlogAIService.generateOutline(title, language)
    const durationMs = Date.now() - start
    const inputTokens = estimateInputTokens(body)
    const outputTokens = estimateOutputTokens(outline)
    const estimatedCostUsd = inputTokens * 0.0000001 + outputTokens * 0.0000004
    await logBlogAiUsage(ENDPOINT, request, {
      userId,
      inputTokens,
      outputTokens,
      estimatedCostUsd,
      durationMs,
      success: true,
    })
    return NextResponse.json({ outline })
  } catch (error) {
    const durationMs = Date.now() - start
    await logBlogAiUsage(ENDPOINT, request, {
      userId,
      inputTokens: estimateInputTokens(body),
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })
    return handleApiError(error)
  }
}
