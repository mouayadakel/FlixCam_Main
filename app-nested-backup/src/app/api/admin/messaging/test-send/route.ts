/**
 * POST – send a test message (WhatsApp, Email, SMS) to a given recipient
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
import { SmsService } from '@/lib/services/sms.service'
import { EmailService } from '@/lib/services/email.service'
import { handleApiError } from '@/lib/utils/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canUpdate = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const channel = body.channel as string
    const to = body.to as string
    const text = (body.body ?? body.subject ?? 'Test message') as string
    const subject = (body.subject ?? 'Test – FlixCam') as string

    if (!to?.trim()) {
      return NextResponse.json({ error: 'Recipient (to) is required' }, { status: 400 })
    }

    switch (channel) {
      case 'WHATSAPP': {
        const result = await WhatsAppService.sendWhatsAppText(to.trim(), text, { logToMessageLog: true })
        if (!result.ok) {
          return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 500 })
        }
        return NextResponse.json({ ok: true, messageId: result.messageId })
      }
      case 'SMS': {
        const result = await SmsService.sendSmsText(to.trim(), text, { logToMessageLog: true })
        if (!result.ok) {
          return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 500 })
        }
        return NextResponse.json({ ok: true, messageId: result.messageId })
      }
      case 'EMAIL': {
        const html = `<p>${text.replace(/\n/g, '<br>')}</p>`
        const result = await EmailService.send({
          to: to.trim(),
          subject,
          html,
          logToMessageLog: true,
        })
        if (!result.ok) {
          return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 500 })
        }
        return NextResponse.json({ ok: true })
      }
      default:
        return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
    }
  } catch (error) {
    return handleApiError(error)
  }
}
