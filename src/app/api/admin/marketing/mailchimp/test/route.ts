import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

async function getMailchimpKey(): Promise<string> {
  // Prefer DB setting, fall back to env
  try {
    const row = await prisma.siteSetting.findFirst({
      where: { key: 'mailchimp_api_key' }
    })
    if (row?.value?.trim()) return row.value.trim()
  } catch { /* ignore */ }
  return process.env.MAILCHIMP_API_KEY || ''
}

async function getMailchimpServer(key: string): Promise<string> {
  // Last part of key after dash, e.g. us14
  const parts = key.split('-')
  return parts[parts.length - 1] || 'us1'
}

export async function GET() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId || !(await hasPermission(userId, PERMISSIONS.MARKETING_READ))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const apiKey = await getMailchimpKey()
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'Mailchimp API key not configured.' })
    }

    const server = await getMailchimpServer(apiKey)
    const res = await fetch(`https://${server}.api.mailchimp.com/3.0/ping`, {
      headers: { Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `HTTP ${res.status} from Mailchimp` })
    }

    // Fetch lists
    const listsRes = await fetch(`https://${server}.api.mailchimp.com/3.0/lists?count=3`, {
      headers: { Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}` },
      cache: 'no-store',
    })

    if (listsRes.ok) {
      const data = await listsRes.json() as { lists: Array<{ name: string; stats: { member_count: number } }> }
      const first = data.lists?.[0]
      return NextResponse.json({
        ok: true,
        listName: first?.name,
        memberCount: first?.stats?.member_count,
        totalLists: data.lists?.length,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) })
  }
}
