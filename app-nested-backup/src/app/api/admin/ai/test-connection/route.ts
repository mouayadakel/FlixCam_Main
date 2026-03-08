/**
 * @file route.ts
 * @description Test AI provider connection (OpenAI / Gemini)
 * @module app/api/admin/ai/test-connection
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const provider = (body.provider ?? 'openai') as 'openai' | 'gemini'

    const setting = await prisma.aISettings.findUnique({
      where: { provider },
    })

    // Use DB key if present and valid, otherwise fall back to env (so .env-only setup works)
    const openaiKey =
      (setting?.apiKey && setting.apiKey.length >= 10 && !setting.apiKey.startsWith('****')
        ? setting.apiKey
        : null) ??
      process.env.OPENAI_API_KEY ??
      null
    const geminiKey =
      (setting?.apiKey && setting.apiKey.length >= 10 && !setting.apiKey.startsWith('****')
        ? setting.apiKey
        : null) ??
      process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
      null

    if (provider === 'openai') {
      if (!openaiKey) {
        return NextResponse.json(
          {
            ok: false,
            error: 'مفتاح API غير مُعرّف. أدخله في الإعدادات أو في .env (OPENAI_API_KEY)',
          },
          { status: 200 }
        )
      }
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${openaiKey}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return NextResponse.json(
          {
            ok: false,
            error:
              (err as { error?: { message?: string } })?.error?.message ?? 'فشل الاتصال بـ OpenAI',
          },
          { status: 200 }
        )
      }
      return NextResponse.json({ ok: true, message: 'تم الاتصال بـ OpenAI بنجاح' })
    }

    if (provider === 'gemini') {
      if (!geminiKey) {
        return NextResponse.json(
          {
            ok: false,
            error: 'مفتاح API غير مُعرّف. أدخله في الإعدادات أو في .env (GEMINI_API_KEY)',
          },
          { status: 200 }
        )
      }
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        method: 'GET',
        headers: { 'x-goog-api-key': geminiKey },
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: { message?: string; status?: string }
        }
        const message =
          err?.error?.message ??
          (res.status === 400
            ? 'مفتاح API غير صالح أو منتهي'
            : res.status === 403
              ? 'الوصول مرفوض أو تجاوز الحصة'
              : 'فشل الاتصال بـ Gemini')
        return NextResponse.json({ ok: false, error: message }, { status: 200 })
      }
      return NextResponse.json({ ok: true, message: 'تم الاتصال بـ Gemini بنجاح' })
    }

    return NextResponse.json({ ok: false, error: 'مزود غير مدعوم' }, { status: 400 })
  } catch (error) {
    console.error('Test connection error:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'خطأ غير متوقع' },
      { status: 500 }
    )
  }
}
