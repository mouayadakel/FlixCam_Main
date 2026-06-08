/**
 * @file route.ts
 * @description API route to trigger AI damage analysis
 * @module app/api/admin/damage/[id]/analyze/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { DamageAnalysisService } from '@/lib/services/damage-analysis.service'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
    if (!(await hasAIPermission(session.user.id, 'run'))) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const { id } = await context.params
    const claim = await DamageAnalysisService.triggerAnalysis(id)
    return NextResponse.json({ success: true, claim })
  } catch (error) {
    console.error('AI Analysis trigger error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'حدث خطأ أثناء تشغيل تحليل الذكاء الاصطناعي' },
      { status: 500 }
    )
  }
}
